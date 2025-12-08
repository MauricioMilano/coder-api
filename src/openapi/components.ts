/**
 * @openapi
 * components:
 *   schemas:
 *     FileEntry:
 *       type: object
 *       properties:
 *         path:
 *           type: string
 *         size:
 *           type: integer
 *         isDirectory:
 *           type: boolean
 *     FileContent:
 *       type: object
 *       properties:
 *         path:
 *           type: string
 *         content:
 *           type: string
 *         encoding:
 *           type: string
 *           enum: [text, base64]
 *     CreateFileRequest:
 *       type: object
 *       required: [path, content]
 *       properties:
 *         path:
 *           type: string
 *         content:
 *           type: string
 *         encoding:
 *           type: string
 *           enum: [text, base64]
 *     PatchOperation:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           description: Operation type (replace|lines|code_block|insert|diff)
 *         # additional operation-specific fields are described inline per endpoint
 *     SearchQuery:
 *       type: object
 *       properties:
 *         path:
 *           type: string
 *         query:
 *           type: string
 *         regex:
 *           type: boolean
 *         case_sensitive:
 *           type: boolean
 *         max_results:
 *           type: integer
 *     SearchResultEntry:
 *       type: object
 *       properties:
 *         file:
 *           type: string
 *         line:
 *           type: integer
 *         context:
 *           type: string
 *     BashRequest:
 *       type: object
 *       properties:
 *         cmd:
 *           type: string
 *         timeout:
 *           type: integer
 *     BashResponse:
 *       type: object
 *       properties:
 *         stdout:
 *           type: string
 *         stderr:
 *           type: string
 *         exitCode:
 *           type: integer
 *     PM2AppOptions:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         script:
 *           type: string
 *         cwd:
 *           type: string
 *         args:
 *           type: array
 *           items:
 *             type: string
 *         env:
 *           type: object
 *     PM2AppInfo:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         pm_id:
 *           type: integer
 *         status:
 *           type: string
 */
export {};
