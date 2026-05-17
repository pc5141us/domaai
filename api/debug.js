import { appsGet, appsPost } from './gsheets.js';

export default async function handler(req, res) {
    try {
        // Test 1: getAll
        const allData = await appsGet({ action: 'getAll' });
        
        // Test 2: Try adding a test record
        const testAdd = await appsPost({
            action: 'add',
            table: 'lessons',
            payload: { title: 'TEST_DEBUG', url: 'https://test.com', description: 'debug test' }
        });

        // Test 3: Get the raw URL being called
        const testUrl = new URL(process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzZA8foEVn5-ltu4nPvJbXl-I2TIeT-ZW4QjCYaeSeIDUvGv-TXACcFdAOb2YYHfXUi/exec');
        testUrl.searchParams.set('payload', JSON.stringify({ action: 'add', table: 'lessons', payload: { title: 'T', url: 'U' } }));

        return res.status(200).json({
            allData_success: allData?.success,
            allData_lessons_count: allData?.data?.lessons?.length,
            allData_users_count: allData?.data?.users?.length,
            testAdd_result: testAdd,
            test_url_length: testUrl.toString().length,
        });
    } catch (e) {
        return res.status(500).json({ error: e.message, stack: e.stack });
    }
}
