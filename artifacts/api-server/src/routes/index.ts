import { Router, type IRouter } from "express";
import eloRouter from "./elo";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eloRouter);

export default router;
