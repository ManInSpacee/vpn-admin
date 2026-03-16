function auth(req: any, res: any, next: any) {
  const key = req.headers["x-api-key"];
  if (key === process.env["API_KEY"]) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export { auth };
