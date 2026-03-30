/**
 * Variables mínimas para que emailService y otros módulos no fallen al importarse en tests.
 * Los clientes reales (Supabase / Resend) están sustituidos por mocks en los archivos de prueba.
 */
process.env.REACT_APP_RESEND_API_KEY = "re_test_mock_key";
process.env.REACT_APP_SUPABASE_URL = "https://test.supabase.co";
process.env.REACT_APP_SUPABASE_ANON_KEY = "test-anon-key";
