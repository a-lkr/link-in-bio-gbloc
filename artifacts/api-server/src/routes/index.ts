import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import moderationRouter from "./moderation";
import storageRouter from "./storage";
import accountDeletionRouter from "./account-deletion";
import legalRouter from "./legal";
import accountEmailRouter from "./account-email";
import membershipsRouter from "./memberships";
import authRouter from "./auth";
import billingRouter from "./billing";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(profilesRouter);
router.use(moderationRouter);
router.use(storageRouter);
router.use(accountDeletionRouter);
router.use(legalRouter);
router.use(accountEmailRouter);
router.use(membershipsRouter);
router.use(billingRouter);

export default router;
