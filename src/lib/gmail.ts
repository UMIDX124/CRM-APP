import { google } from "googleapis";
import { prisma } from "./db";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/** Generate the Google OAuth consent URL */
export function getAuthUrl(userId: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: userId,
  });
}

/** Exchange authorization code for tokens and store in DB */
export async function handleCallback(code: string, userId: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing tokens from Google OAuth");
  }

  // Get the authenticated user's email
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();

  await prisma.gmailToken.upsert({
    where: { userId },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date || Date.now() + 3600_000),
      email: data.email || "",
    },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date || Date.now() + 3600_000),
      email: data.email || "",
    },
  });

  return { email: data.email };
}

/** Get an authenticated Gmail client for a user, refreshing tokens if needed */
async function getGmailClient(userId: string) {
  const token = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!token) throw new Error("Gmail not connected");

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  });

  // Auto-refresh if expired
  if (token.expiresAt.getTime() < Date.now() + 60_000) {
    const { credentials } = await client.refreshAccessToken();
    await prisma.gmailToken.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date || Date.now() + 3600_000),
      },
    });
    client.setCredentials(credentials);
  }

  return google.gmail({ version: "v1", auth: client });
}

/** Fetch email threads matching a query (e.g. a client's email address) */
export async function getThreads(userId: string, query: string, maxResults = 20) {
  const gmail = await getGmailClient(userId);

  const { data } = await gmail.users.threads.list({
    userId: "me",
    q: query,
    maxResults,
  });

  if (!data.threads?.length) return [];

  const threads = await Promise.all(
    data.threads.slice(0, 10).map(async (t) => {
      const thread = await gmail.users.threads.get({
        userId: "me",
        id: t.id!,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });

      const messages = (thread.data.messages || []).map((msg) => {
        const headers = msg.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

        return {
          id: msg.id,
          from: getHeader("From"),
          to: getHeader("To"),
          subject: getHeader("Subject"),
          date: getHeader("Date"),
          snippet: msg.snippet || "",
        };
      });

      return {
        id: t.id,
        subject: messages[0]?.subject || "(no subject)",
        messageCount: messages.length,
        lastDate: messages[messages.length - 1]?.date || "",
        messages,
      };
    })
  );

  return threads;
}

/** Send an email via Gmail API */
export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
) {
  const gmail = await getGmailClient(userId);
  const token = await prisma.gmailToken.findUnique({ where: { userId } });
  const from = token?.email || "me";

  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    body,
  ];

  const raw = Buffer.from(messageParts.join("\r\n")).toString("base64url");

  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId },
  });

  // Log to DB
  await prisma.emailLog.create({
    data: { userId, to, subject, body, threadId, messageId: data.id },
  });

  return { messageId: data.id, threadId: data.threadId };
}

/** Check if a user has Gmail connected */
export async function getGmailStatus(userId: string) {
  const token = await prisma.gmailToken.findUnique({
    where: { userId },
    select: { email: true, expiresAt: true },
  });

  if (!token) return { connected: false, email: null };
  return { connected: true, email: token.email, expiresAt: token.expiresAt };
}
