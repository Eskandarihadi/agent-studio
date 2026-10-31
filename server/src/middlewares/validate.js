// Checks req.body against a zod schema and replaces it with the parsed value.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const first = result.error.issues[0];
      return res.status(400).json({ error: `${first.path.join(".") || "body"}: ${first.message}` });
    }
    req.body = result.data;
    next();
  };
}
