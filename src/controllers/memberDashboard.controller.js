const memberDashboardService = require('../services/memberDashboard.service');
const response = require('../utils/response');

class MemberDashboardController {
  /**
   * Get member dashboard data
   * GET /api/members/dashboard
   */
  async getDashboard(req, res) {
    try {
      const userId = req.user.id; // From auth middleware

      const result = await memberDashboardService.getMemberDashboard(userId);

      if (!result.success) {
        return response.error(res, result.message, 500);
      }

      return response.success(res, result.data, 'Dashboard data retrieved successfully');
    } catch (error) {
      console.error('Error in getDashboard:', error);
      return response.error(res, 'Failed to load dashboard', 500);
    }
  }
}

module.exports = new MemberDashboardController();