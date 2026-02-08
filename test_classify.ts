
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY env vars')
    Deno.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testClassify() {
    console.log('Testing classify-entry function...')
    
    const text = 'Comprar leite e ovos no supermercado'
    console.log(`Input: "${text}"`)

    const { data, error } = await supabase.functions.invoke('classify-entry', {
        body: { content: text }
    })

    if (error) {
        console.error('Error:', error)
        if (error instanceof Error) {
             console.error('Message:', error.message)
             // @ts-ignore
             console.error('Context:', error.context)
        }
    } else {
        console.log('Success!')
        console.log('Result:', JSON.stringify(data, null, 2))
        
        // Basic assertions
        const isValid = 
            ['home', 'work', 'uni', 'ideas'].includes(data.category_slug) &&
            ['task', 'note', 'insight', 'bookmark'].includes(data.entry_type) &&
            data.metadata.summary &&
            Array.isArray(data.metadata.tags);

        if (isValid) {
            console.log('✅ Test Passed: Response structure is correct.')
        } else {
            console.error('❌ Test Failed: Invalid response structure.')
        }
    }
}

testClassify()
