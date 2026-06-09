import { Injectable } from "@nestjs/common";

@Injectable()
export class AiService {
  answer(prompt: string) {
    return {
      prompt,
      language: /[A-Za-z]/.test(prompt) ? "English or Somali" : "Somali",
      answer: "AI integration is ready. Connect OPENAI_API_KEY to answer live operational queries from system data."
    };
  }
}
