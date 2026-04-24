const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RCET Lab Management System API',
      version: '1.0.0',
      description: 'Backend API for the RCET Research Lab Management System — Part 1: Auth Foundation',
    },
    servers: [
      {
        url: `http://localhost:${env.port}/api`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['full_name', 'email', 'password'],
          properties: {
            full_name: { type: 'string', example: 'Nguyen Van A' },
            email: { type: 'string', format: 'email', example: 'user@lab.com' },
            password: { type: 'string', example: 'StrongPass1!' },
            student_code: { type: 'string', example: 'SV001', nullable: true },
            department: { type: 'string', example: 'Computer Science', nullable: true },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@lab.com' },
            password: { type: 'string', example: 'Admin123!' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@lab.com' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string', example: 'abc123resettoken' },
            password: { type: 'string', example: 'NewStrongPass1!' },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['current_password', 'new_password'],
          properties: {
            current_password: { type: 'string', example: 'OldPass1!' },
            new_password: { type: 'string', example: 'NewPass1!' },
          },
        },
        ApproveRequest: {
          type: 'object',
          required: ['system_role'],
          properties: {
            system_role: {
              type: 'string',
              enum: ['admin', 'vien_truong', 'truong_lab', 'leader', 'member', 'guest'],
              example: 'member',
            },
            review_note: { type: 'string', example: 'Approved. Welcome!', nullable: true },
          },
        },
        RejectRequest: {
          type: 'object',
          properties: {
            review_note: { type: 'string', example: 'Incomplete information.', nullable: true },
          },
        },

        // ======== Project Schemas ========
        CreateProjectRequest: {
          type: 'object',
          required: ['code', 'name', 'leader_id', 'start_date', 'end_date'],
          properties: {
            code: { type: 'string', example: 'ROBOARM-24' },
            name: { type: 'string', example: 'Robotic Arm Project 2024', minLength: 5 },
            description: { type: 'string', example: 'Full markdown description supported', nullable: true },
            tag: { type: 'string', enum: ['AI/ML', 'FPGA', 'Robotics', 'Embedded', 'DSP', 'IoT', 'Other'], example: 'Robotics' },
            status: { type: 'string', enum: ['planning', 'active', 'paused', 'done', 'archived'], default: 'planning' },
            leader_id: { type: 'string', format: 'uuid', example: 'uuid-of-leader' },
            start_date: { type: 'string', format: 'date', example: '2024-01-01' },
            end_date: { type: 'string', format: 'date', example: '2024-12-31' },
            budget: { type: 'integer', example: 50000000, nullable: true },
            members: { type: 'array', items: { type: 'string', format: 'uuid' }, nullable: true },
            git_repo_url: { type: 'string', format: 'uri', example: 'https://github.com/org/repo', nullable: true },
          },
        },
        UpdateProjectRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Updated Project Name' },
            description: { type: 'string', nullable: true },
            tag: { type: 'string', enum: ['AI/ML', 'FPGA', 'Robotics', 'Embedded', 'DSP', 'IoT', 'Other'] },
            status: { type: 'string', enum: ['planning', 'active', 'paused', 'done', 'archived'] },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            budget: { type: 'integer', nullable: true },
          },
        },
        CreateTaskRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: 'Implement servo controller' },
            description: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
            assignee_id: { type: 'string', format: 'uuid', nullable: true },
            due_date: { type: 'string', format: 'date', nullable: true },
          },
        },
        UpdateTaskRequest: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            assignee_id: { type: 'string', format: 'uuid', nullable: true },
            due_date: { type: 'string', format: 'date', nullable: true },
          },
        },
        CreateMilestoneRequest: {
          type: 'object',
          required: ['title', 'due_date'],
          properties: {
            title: { type: 'string', example: 'Prototype v1 — Servo control' },
            description: { type: 'string', nullable: true },
            due_date: { type: 'string', format: 'date', example: '2024-06-01' },
            linked_tasks: { type: 'array', items: { type: 'string', format: 'uuid' }, nullable: true },
          },
        },
        UpdateMilestoneRequest: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            due_date: { type: 'string', format: 'date' },
            done: { type: 'boolean' },
            linked_tasks: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
        AddMemberRequest: {
          type: 'object',
          required: ['user_id'],
          properties: {
            user_id: { type: 'string', format: 'uuid' },
            role: { type: 'string', enum: ['leader', 'member'], default: 'member' },
          },
        },
        CreateReportRequest: {
          type: 'object',
          required: ['content', 'week_number', 'year'],
          properties: {
            content: { type: 'string', example: 'Completed servo calibration this week.' },
            week_number: { type: 'integer', example: 15, minimum: 1, maximum: 53 },
            year: { type: 'integer', example: 2024 },
          },
        },
        UpdateGitRepoRequest: {
          type: 'object',
          required: ['git_repo_url', 'git_provider'],
          properties: {
            git_repo_url: { type: 'string', format: 'uri', example: 'https://github.com/org/roboarm' },
            git_provider: { type: 'string', enum: ['github', 'gitlab', 'bitbucket'], example: 'github' },
            git_default_branch: { type: 'string', example: 'main' },
            git_visibility: { type: 'string', enum: ['private', 'public', 'internal'], default: 'private' },
          },
        },
        GitWebhookRequest: {
          type: 'object',
          required: ['sha', 'author', 'message', 'timestamp'],
          properties: {
            sha: { type: 'string', example: 'a3f9b12c45d6e78f9012345678901234abcdef01' },
            author: { type: 'string', example: 'Nguyen Van A' },
            message: { type: 'string', example: 'Fix servo deadzone issue' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },

        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object', nullable: true },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' }, nullable: true },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Admin', description: 'Admin approval management (admin role required)' },
      { name: 'Projects', description: 'Project management — list, create, update' },
      { name: 'Tasks', description: 'Task board (Kanban) per project' },
      { name: 'Members', description: 'Project member management' },
      { name: 'Milestones', description: 'Master plan milestones & timeline' },
      { name: 'Reports', description: 'Weekly progress reports & compliance matrix' },
      { name: 'Git', description: 'Git repository integration (truong_lab only)' },
    ],
    paths: {
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          description: 'Creates a new user with status=pending and sends email verification.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
          },
          responses: {
            201: { description: 'Registration successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'Validation error' },
            409: { description: 'Email or student code already exists' },
          },
        },
      },
      '/auth/verify-email': {
        get: {
          tags: ['Auth'],
          summary: 'Verify email address',
          description: 'Verifies the user email and creates an ApprovalRequest.',
          parameters: [
            { name: 'token', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Email verified successfully' },
            400: { description: 'Invalid or expired token' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          description: 'Returns access_token and refresh_token. Pending users can login but get a pending message.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: {
            200: { description: 'Login successful' },
            401: { description: 'Invalid credentials' },
            403: { description: 'Account not verified / rejected / locked' },
          },
        },
      },
      '/auth/google': {
        get: {
          tags: ['Auth'],
          summary: 'Google OAuth — open in browser',
          description: '⚠️ **Cannot be tested from Swagger UI.** This redirects to Google login page.\n\nOpen this URL directly in your browser:\n```\nhttp://localhost:3000/api/auth/google\n```\nAfter login, Google redirects to `/api/auth/google/callback` which returns an `access_token` and `refresh_token`.',
          responses: {
            302: { description: 'Redirect to Google consent screen' },
          },
        },
      },
      '/auth/google/callback': {
        get: {
          tags: ['Auth'],
          summary: 'Google OAuth callback (handled by server)',
          description: 'Callback URL after Google authentication. Redirects client to `CLIENT_URL/auth/callback?access_token=...&refresh_token=...&status=...`',
          parameters: [
            { name: 'code', in: 'query', schema: { type: 'string' }, description: 'Authorization code from Google' },
          ],
          responses: {
            302: { description: 'Redirect to frontend with tokens' },
            401: { description: 'Authentication failed' },
          },
        },
      },
      '/auth/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Forgot password',
          description: 'Sends a password reset link to the registered email.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } } },
          },
          responses: {
            200: { description: 'Reset email sent (always returns 200 to prevent enumeration)' },
          },
        },
      },
      '/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password',
          description: 'Resets password using the token from the email link.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } } },
          },
          responses: {
            200: { description: 'Password reset successfully' },
            400: { description: 'Invalid or expired token' },
          },
        },
      },
      '/auth/refresh-token': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refresh_token'],
                  properties: { refresh_token: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'New access token returned' },
            401: { description: 'Invalid or expired refresh token' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'User profile returned' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/auth/change-password': {
        post: {
          tags: ['Auth'],
          summary: 'Change password',
          description: 'Authenticated user changes their own password.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } } },
          },
          responses: {
            200: { description: 'Password changed successfully' },
            401: { description: 'Current password incorrect' },
          },
        },
      },
      '/admin/approval-requests': {
        get: {
          tags: ['Admin'],
          summary: 'List all approval requests',
          description: 'Returns paginated list of approval requests. Filter by status.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
          ],
          responses: {
            200: { description: 'List returned successfully' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden — admin role required' },
          },
        },
      },
      '/admin/approval/{id}/approve': {
        post: {
          tags: ['Admin'],
          summary: 'Approve a user',
          description: 'Sets user status=active and assigns a system_role.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApproveRequest' } } },
          },
          responses: {
            200: { description: 'User approved' },
            400: { description: 'Already processed' },
            404: { description: 'Approval request not found' },
          },
        },
      },
      '/admin/approval/{id}/reject': {
        post: {
          tags: ['Admin'],
          summary: 'Reject a user',
          description: 'Sets user status=rejected and sends rejection email.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RejectRequest' } } },
          },
          responses: {
            200: { description: 'User rejected' },
            400: { description: 'Already processed' },
            404: { description: 'Approval request not found' },
          },
        },
      },

      // ======== Projects ========
      '/projects': {
        get: {
          tags: ['Projects'],
          summary: 'List all projects',
          description: 'truong_lab/vien_truong see all. leader/member see only their projects. Filter by status/tag.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['planning', 'active', 'paused', 'done', 'archived'] } },
            { name: 'tag', in: 'query', schema: { type: 'string', enum: ['AI/ML', 'FPGA', 'Robotics', 'Embedded', 'DSP', 'IoT', 'Other'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
          ],
          responses: {
            200: { description: 'List of project cards with stats (member_count, task_progress, report_rate, at_risk)' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Projects'],
          summary: 'Create a new project',
          description: 'Only truong_lab and vien_truong can create projects. Project code is auto-uppercased.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProjectRequest' } } },
          },
          responses: {
            201: { description: 'Project created. Leader is auto-added as a member.' },
            400: { description: 'Validation error' },
            403: { description: 'Forbidden — truong_lab/vien_truong only' },
            409: { description: 'Project code already exists' },
          },
        },
      },
      '/projects/check-code': {
        get: {
          tags: ['Projects'],
          summary: 'Check project code availability',
          description: 'Debounce 500ms on frontend. Returns { exists: true/false }.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'code', in: 'query', required: true, schema: { type: 'string', example: 'ROBOARM-24' } },
          ],
          responses: {
            200: { description: '{ exists: false } = available, { exists: true } = taken' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/projects/{id}': {
        get: {
          tags: ['Projects'],
          summary: 'Get project detail',
          description: 'Returns full project info. member/leader of project + admin roles can access.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Project detail' },
            403: { description: 'Not a member of this project' },
            404: { description: 'Project not found' },
          },
        },
        put: {
          tags: ['Projects'],
          summary: 'Update project',
          description: 'truong_lab/vien_truong: all fields. Leader: name, description, status only. Member: 403.\n\n**Status transitions:** planning→active→paused→done→archived. Only truong_lab can archive.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProjectRequest' } } },
          },
          responses: {
            200: { description: 'Project updated' },
            400: { description: 'Invalid status transition' },
            403: { description: 'Forbidden or leader trying to update restricted field' },
            404: { description: 'Project not found' },
          },
        },
      },
      '/projects/{id}/overview': {
        get: {
          tags: ['Projects'],
          summary: 'Project overview (Tab 1)',
          description: 'Returns project info + task counts by status + 8-week report chart + 3 nearest milestones + member preview.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Overview data' },
            403: { description: 'Not a project member' },
            404: { description: 'Not found' },
          },
        },
      },

      // ======== Tasks ========
      '/projects/{id}/tasks': {
        get: {
          tags: ['Tasks'],
          summary: 'List tasks in project (Tab 2)',
          description: 'Kanban data — filter by assignee, priority, status.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'assignee_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'] } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            200: { description: 'Paginated task list' },
            403: { description: 'Not a project member' },
          },
        },
        post: {
          tags: ['Tasks'],
          summary: 'Create task',
          description: 'Admin and project leader can create tasks. Member: 403.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTaskRequest' } } },
          },
          responses: {
            201: { description: 'Task created' },
            403: { description: 'Members cannot create tasks' },
          },
        },
      },
      '/projects/{id}/tasks/{taskId}': {
        get: {
          tags: ['Tasks'],
          summary: 'Get task detail',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Task with assignee, creator, milestones' },
            404: { description: 'Task not found' },
          },
        },
        put: {
          tags: ['Tasks'],
          summary: 'Update task',
          description: 'admin/leader: all fields. Member: only status of their own assigned task.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateTaskRequest' } } },
          },
          responses: {
            200: { description: 'Task updated' },
            403: { description: 'Members can only update their own task status' },
            404: { description: 'Task not found' },
          },
        },
      },

      // ======== Members ========
      '/projects/{id}/members': {
        get: {
          tags: ['Members'],
          summary: 'List project members (Tab 4)',
          description: 'Returns members with role, joined_at, task_count, report_rate.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Member list with stats' },
            403: { description: 'Not a project member' },
          },
        },
        post: {
          tags: ['Members'],
          summary: 'Add member to project',
          description: 'truong_lab or project leader can add members.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AddMemberRequest' } } },
          },
          responses: {
            201: { description: 'Member added' },
            400: { description: 'User not found or not active' },
            403: { description: 'Forbidden' },
            409: { description: 'User already a member' },
          },
        },
      },
      '/projects/{id}/members/{memberId}': {
        delete: {
          tags: ['Members'],
          summary: 'Remove member from project',
          description: 'truong_lab or project leader. Cannot remove the project leader.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'memberId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Member removed' },
            400: { description: 'Cannot remove the project leader' },
            403: { description: 'Forbidden' },
            404: { description: 'Member not found' },
          },
        },
      },

      // ======== Milestones ========
      '/projects/{id}/milestones': {
        get: {
          tags: ['Milestones'],
          summary: 'List milestones & timeline (Tab 5)',
          description: 'Returns milestones with progress bar (done/total) and color: green=done on time, red=done late, yellow=near deadline (<7d), gray=far.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: '{ progress: { done, total }, milestones: [...] }' },
          },
        },
        post: {
          tags: ['Milestones'],
          summary: 'Create milestone',
          description: 'truong_lab and project leader only.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMilestoneRequest' } } },
          },
          responses: {
            201: { description: 'Milestone created' },
            403: { description: 'Members cannot create milestones' },
          },
        },
      },
      '/projects/{id}/milestones/{milestoneId}': {
        put: {
          tags: ['Milestones'],
          summary: 'Update milestone / mark done',
          description: 'If marking done=true with incomplete linked tasks, returns a `warning` field but still saves.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'milestoneId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateMilestoneRequest' } } },
          },
          responses: {
            200: { description: 'Milestone updated. May include { warning: "N linked tasks not done" }' },
            403: { description: 'Members cannot update milestones' },
            404: { description: 'Milestone not found' },
          },
        },
      },

      // ======== Reports ========
      '/projects/{id}/reports': {
        get: {
          tags: ['Reports'],
          summary: 'List weekly reports (Tab 3)',
          description: 'Filter by week_number, year, user_id.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'week_number', in: 'query', schema: { type: 'integer' } },
            { name: 'year', in: 'query', schema: { type: 'integer' } },
            { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            200: { description: 'Paginated report list' },
          },
        },
        post: {
          tags: ['Reports'],
          summary: 'Submit weekly report',
          description: 'Any project member (including leader) submits their own weekly report. Status=submitted if on time, late if after due date.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateReportRequest' } } },
          },
          responses: {
            201: { description: 'Report submitted' },
            403: { description: 'Not a project member' },
            409: { description: 'Report for this week already submitted' },
          },
        },
      },
      '/projects/{id}/reports/compliance': {
        get: {
          tags: ['Reports'],
          summary: 'Compliance matrix — member × week',
          description: 'Returns a matrix of members vs. weeks. Each cell: { status: submitted/late/missing }. Used for the heatmap grid.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'weeks', in: 'query', schema: { type: 'integer', example: 8 }, description: 'How many past weeks to include (default 8)' },
          ],
          responses: {
            200: { description: 'Matrix array [ { user, weeks: [{ week_number, year, status }] } ]' },
          },
        },
      },

      // ======== Git Repo ========
      '/projects/{id}/git': {
        get: {
          tags: ['Git'],
          summary: 'Get git repository info (truong_lab only)',
          description: '🔒 Returns 403 immediately for any other role.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: '{ repo_url, provider, default_branch, visibility, last_commit: { sha(7), author, message, date } }' },
            403: { description: 'Forbidden — truong_lab only' },
          },
        },
        put: {
          tags: ['Git'],
          summary: 'Link / update git repository (truong_lab only)',
          description: 'Sets repo URL, provider, branch, visibility. Commit data is updated via webhook — no access token stored.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateGitRepoRequest' } } },
          },
          responses: {
            200: { description: 'Git repo updated' },
            403: { description: 'Forbidden — truong_lab only' },
          },
        },
      },
      '/projects/{id}/git/webhook': {
        post: {
          tags: ['Git'],
          summary: 'Git webhook — receive commit data',
          description: 'Called by GitHub/GitLab/Bitbucket webhook after each push. Updates `last_commit` fields. No JWT required — should be secured with webhook secret in production.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GitWebhookRequest' } } },
          },
          responses: {
            200: { description: 'Webhook processed, last_commit updated' },
            404: { description: 'Project not found' },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
