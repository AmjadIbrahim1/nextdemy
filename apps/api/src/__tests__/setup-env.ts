process.env.NODE_ENV = "test";
process.env.PORT = "5000";
process.env.MONGODB_URI =
  process.env.TEST_MONGODB_URI ??
  "mongodb://127.0.0.1:27017/nextdemy_integration_test";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.CORS_ORIGINS = "";
process.env.API_URL = "http://localhost:5000";
process.env.ALLOW_VERCEL_PREVIEWS = "false";
process.env.TRUST_PROXY = "1";
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789abcdef";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789abcdef";
process.env.JWT_SECRET = "test-legacy-secret-0123456789abcdef";
process.env.PAYMENT_MODE = "mock";
process.env.PAYMENT_MOCK_OUTCOME = "success";
process.env.PAYMENT_MOCK_SECRET = "test-payment-secret-0123456789abcdef";
process.env.PAYMENT_CURRENCY = "EGP";
process.env.COOKIE_SAME_SITE = "lax";
process.env.RESEND_API_KEY = "";
process.env.EMAIL_FROM = "onboarding@resend.dev";
process.env.EMAIL_FROM_NAME = "Nextdemy Test";
process.env.CONTACT_MAIL = "contact@example.com";
process.env.LOG_LEVEL = "error";
