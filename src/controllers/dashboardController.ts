import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as dashboardService from "../services/dashboard.service.js";

export const overview = catchAsync(async (req, res) => {
  const data = await dashboardService.dashboardOverview(req.authCompanyId!);
  sendSuccess(res, data);
});
