import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as dashboardService from "../services/dashboard.service.js";

export const overview = catchAsync(async (_req, res) => {
  const data = await dashboardService.dashboardOverview();
  sendSuccess(res, data);
});
