import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai"
import { AxiosError } from "axios"

require('dotenv').config();

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
}));

interface Text {
    question: string,
    answer: string,
}

const getTextMessages = (text: Text): ChatCompletionRequestMessage[] => [
    {role: "user", content: text.question},
    {role: "assistant", content: text.answer},
]

const pastSummaryFromId: Record<string, string> = {}

const buildSummary = async (from_id: string, questionToMerge: Text): Promise<ChatCompletionRequestMessage> => {
    const pastSummary: ChatCompletionRequestMessage | null = pastSummaryFromId[from_id] ? {
        role: "system",
        content: "Your previously generated summary:" + pastSummaryFromId[from_id]
    } : null

    const prompt: ChatCompletionRequestMessage[] = [
        {role: "system", content: "انت روبوت ذكي تمت برمجتك على يد Undercoder للمساعدة على الدخول الى شبكة تور عبر تقديم الشرح الازم  عن شبكة Tor وارسال روابط تحميل التطبيق عبر apple & google play وانك جزء من مشروع سوف يتم اطلاقة قريبا والمشروع سوف يحتوي على الكثير من الخدمات الرهيبه التي تتم بسرية تامه حتى الان، وانك تستطيع الرد على الرسائل النصية والصوتية وقم بارفاق  توقيع لكل الردود °•UnderCodeR•°."},
    ]

    if (pastSummary) {
        prompt.push(pastSummary)
    }

    prompt.push(...getTextMessages(questionToMerge))
    
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: prompt,
    })

    const newSummary = completion.data.choices[0].message?.content ?? ""
    pastSummaryFromId[from_id] = newSummary

    return {
        role: "system",
        content: "ملخص المحادثة التي اجريتها مع المستخدم حتى الان،ولا تنسى اضافة التوقيع(°•Undercoder•°) في اخر كل رد: " + newSummary
    }
}

const pastQuestionsByFromId: Record<string, Text[]> = {}

const buildPrompt = async (from_id: string, question: string): Promise<ChatCompletionRequestMessage[]> => {
    const pastQuestions = pastQuestionsByFromId[from_id] || []

    const secondLastQuestion = pastQuestions.length < 2 ? null : pastQuestions[pastQuestions.length - 2]
    const summaryMessage = !secondLastQuestion ? null : await buildSummary(from_id, secondLastQuestion)

    const messages: ChatCompletionRequestMessage[] = [
        {role: "system", content: "انت روبوت ذكي تدعى Undercoder Bot تمت لمساعده المستخدمين وتقديم الارشادات اللازمه لهم على كيفيه استخدام لمساعده المستخدمين وتقديم الارشادات اللازمه لهم على كيفيه استخدام شبكه Tor وارسال روابط تحميل التطبيق الملائم لنوع الجهاز الخاص بالمستخدم وقم بارسال قائمه تشمل سلبيات وايجابيات شبكه طور وطرق الدفع وجميع المعلومات اللازمه"},
    ]

    if (summaryMessage) {
        messages.push(summaryMessage)
    }

    if (pastQuestions[pastQuestions.length - 1]) {
        messages.push(...getTextMessages(pastQuestions[pastQuestions.length - 1]))
    }
    
    messages.push({role: "user", content: question})

    return messages
}

export const ask = async (from_id: string, question: string) => {
    pastQuestionsByFromId[from_id] = pastQuestionsByFromId[from_id] || []

    const prompt = await buildPrompt(from_id, question)

    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: prompt,
        })

        const answer = completion.data.choices[0].message?.content ?? ""

        pastQuestionsByFromId[from_id].push({
            question,
            answer: answer,
        })

        return answer
    } catch (error) {
        throw new Error("OpenAI Error: " + JSON.stringify((error as AxiosError).response?.data, null, 2))
    }
}
