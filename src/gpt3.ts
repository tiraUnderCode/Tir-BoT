
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
        content: "  الملخص الذي تم انشائة سابقا ولا تنسى الرموز التعبيرية" + pastSummaryFromId[from_id]
    } : null

    const prompt: ChatCompletionRequestMessage[] = [
        {role: "system", content: "تتمثل مهمتك الوحيدة في تلخيص المحادثة التي أجراها روبوت محادثة يعمل بالذكاء الاصطناعي مع مستخدمه ولا يترك أي تفاصيل مهمة حتى يتمكنوا من المتابعة من حيث توقفوا لاحقًا عن طريق قراءة الملخص وتجيب مع اضافة رموز تعبيرية عندما ترد ."},
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
        content: "ملخص المحادثة التي أجريتها مع المستخدم حتى الآن واجب مع اضافة الرموز التعبيرية:" + newSummary
    }
}

const pastQuestionsByFromId: Record<string, Text[]> = {}

const buildPrompt = async (from_id: string, question: string): Promise<ChatCompletionRequestMessage[]> => {
    const pastQuestions = pastQuestionsByFromId[from_id] || []

    const secondLastQuestion = pastQuestions.length < 2 ? null : pastQuestions[pastQuestions.length - 2]
    const summaryMessage = !secondLastQuestion ? null : await buildSummary(from_id, secondLastQuestion)

    const messages: ChatCompletionRequestMessage[] = [
        {role: "system", content: "أنت مساعد ذكاء اصطناعي مفيد يجيب بشكل مفيد وواقعي على أي استفسارات. يمكنك الرد على كل من الرسائل الصوتية (بالصوت) والرسائل النصية (مع النص) بجميع اللغات السائدة. تسمي نفسك طيرة بوت لان الشاب الذي برمجك من مدينة الطيرة المثلث في فلسطين        ."},
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
