import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import curriculumRouter from "./curriculum";
import logsRouter from "./logs";
import settingsRouter from "./settings";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(curriculumRouter);
router.use(logsRouter);
router.use(settingsRouter);
router.use(analyticsRouter);

export default router;
