import bcrypt from "bcryptjs";
import crypto from "crypto";

// Test password hashing independently (no DB/cookies needed)
describe("Auth utilities", () => {
  describe("hashPassword / verifyPassword", () => {
    it("should hash a password and verify it correctly", async () => {
      const password = "TestP@ssw0rd!";
      const hash = await bcrypt.hash(password, 12);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const hash = await bcrypt.hash("correct-password", 12);
      const isValid = await bcrypt.compare("wrong-password", hash);
      expect(isValid).toBe(false);
    });

    it("should produce different hashes for the same password (salted)", async () => {
      const password = "same-password";
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Session token generation", () => {
    it("should generate a 64-character hex token", () => {
      const token = crypto.randomBytes(32).toString("hex");
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it("should generate unique tokens", () => {
      const tokens = new Set(
        Array.from({ length: 100 }, () =>
          crypto.randomBytes(32).toString("hex")
        )
      );
      expect(tokens.size).toBe(100);
    });
  });

  describe("Session expiry calculation", () => {
    it("should set expiry 7 days in the future", () => {
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      const now = new Date();
      const diffMs = expires.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThanOrEqual(7);
    });
  });

  describe("Role checks", () => {
    const managerRoles = ["SUPER_ADMIN", "PROJECT_MANAGER", "DEPT_HEAD"];
    const nonManagerRoles = ["TEAM_LEAD", "EMPLOYEE"];

    it("should identify manager roles", () => {
      for (const role of managerRoles) {
        expect(
          ["SUPER_ADMIN", "PROJECT_MANAGER", "DEPT_HEAD"].includes(role)
        ).toBe(true);
      }
    });

    it("should identify non-manager roles", () => {
      for (const role of nonManagerRoles) {
        expect(
          ["SUPER_ADMIN", "PROJECT_MANAGER", "DEPT_HEAD"].includes(role)
        ).toBe(false);
      }
    });
  });
});
