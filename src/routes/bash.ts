import { Router, Request, Response } from "express";
import { runBashCommand } from "../core/bash";

const router = Router({ mergeParams: true });

router.post("/", async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const result = await runBashCommand(projectId, req.body);
    return res.json(result);
  } catch (err: any) {
    return res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Execution error", details: err.details });
  }
});

module.exports = router;