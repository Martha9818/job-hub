const { z } = require('zod');

// 注册验证
const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(30, '用户名最多30个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  email: z.string().email('邮箱格式不正确').optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
});

// 登录验证
const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});

// 岗位搜索验证
const jobSearchSchema = z.object({
  keyword: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  industry: z.string().default('机械'),
  salary_min: z.coerce.number().optional(),
  salary_max: z.coerce.number().optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(['latest', 'salary_high', 'salary_low']).default('latest'),
});

// 投递验证
const applySchema = z.object({
  job_ids: z.array(z.string()).min(1, '请选择至少一个岗位').max(50, '单次最多投递50个岗位'),
  resume_id: z.string().min(1, '请选择简历'),
  auto_apply: z.boolean().default(false),  // 是否启用浏览器自动投递
});

function validate(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const errors = result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(422).json({ code: 'VALIDATION_ERROR', errors });
      }
      req.validated = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  jobSearchSchema,
  applySchema,
  validate,
};
