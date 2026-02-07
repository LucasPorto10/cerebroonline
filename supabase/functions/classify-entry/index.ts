// @ts-ignore - Deno global types are provided by Supabase Edge Runtime
import "@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore - Deno npm: specifier
import { GoogleGenAI } from "npm:@google/genai@^1.0.0"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
if (!GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable')
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize the GoogleGenAI client with the API key (as per official docs)
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { content } = await req.json()

        if (!content) {
            throw new Error('Content is required')
        }

        const prompt = `
ROLE: You are an intelligent personal assistant for the MindSync app.
GOAL: Analyze the user's input text and classify it into specific categories and types for organization.

CATEGORIES (Mutually Exclusive):
- 'home': Household tasks, chorses, shopping lists, family matters, maintenance.
- 'work': Professional tasks, meetings, emails, career planning, projects.
- 'uni': Academic study, courses, assignments, learning new skills.
- 'ideas': Creative thoughts, brainstorming, random musings, potential projects, dreams.

TYPES:
- 'task': Actionable items with a clear objective (e.g., "Buy milk", "Email John").
- 'note': Information to remember, reference material (e.g., "The door code is 1234").
- 'insight': Deep realizations, lessons learned (e.g., "I realized I work better in the morning").
- 'bookmark': URLs, book recommendations, movies to watch (e.g., "Check out this website...").

INSTRUCTIONS:
1. Analyze the context and intent of the input TEXT.
2. Select the BEST fitting 'category_slug' and 'entry_type' from the lists above.
3. Generate a short, action-oriented 'summary' (max 6 words).
4. Extract up to 3 relevant 'tags' (lowercase).
5. RETURN ONLY RAW JSON. Do not include markdown formatting, explanations, or chatter.

OUTPUT FORMAT:
{
  "category_slug": "home" | "work" | "uni" | "ideas",
  "entry_type": "task" | "note" | "insight" | "bookmark",
  "metadata": {
    "summary": "Short summary here",
    "tags": ["tag1", "tag2"]
  }
}

Text: "${content}"
`

        // Call the Gemini 3 Flash API using the official SDK syntax with thinking enabled
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                thinkingConfig: {
                    thinkingLevel: 'medium', // Fast response for classification tasks
                },
            },
        })

        const textResponse = response.text

        // Parse the JSON response (clean up markdown if present)
        const jsonMatch = textResponse?.match(/\{[\s\S]*\}/)
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { category_slug: 'ideas', entry_type: 'note' }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error("Gemini 3 SDK Error:", error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
