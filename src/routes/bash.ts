import { Router, Request, Response } from "express";
import { runBashCommand } from "../core/bash";

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /projects/{projectId}/bash:
 *   post:
 *     tags:
 *       - Bash
 *     summary: Run a bash command inside a project's workspace
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BashRequest'
 *     responses:
 *       '200':
 *         description: Command execution result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BashResponse'
 */
router.post('/', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const result = await runBashCommand(projectId, req.body);
    return res.json(result);
  } catch (err: any) {
    return res
      .status(err.statusCode || 500)
      .json({ error: err.message || 'Execution error', details: err.details });
  }
});

module.exports = router;