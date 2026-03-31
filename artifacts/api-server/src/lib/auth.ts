import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.session.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function normalizePhone(phone: string): string {
  let p = phone.trim().replace(/\s+/g, "");
  if (p.startsWith("+966")) {
    p = "0" + p.slice(4);
  } else if (p.startsWith("966") && p.length === 12) {
    p = "0" + p.slice(3);
  }
  if (!p.startsWith("0") && p.length === 9) {
    p = "0" + p;
  }
  return p;
}
