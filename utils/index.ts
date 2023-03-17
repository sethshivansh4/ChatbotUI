import { Message, OpenAIModel } from "@/types";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";

export const OpenAIStream = async (messages: Message[]) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    method: "POST",
    body: JSON.stringify({
      model: OpenAIModel.DAVINCI_TURBO,
      messages: [
        {
          role: "system",
          content: `You are an AI assistant who is an expert in Finance and investing for 'Kairos financial'.
          Some information about 'Kairos financial':
           "We Are Building for Your Success.
          We are a diverse group of veteran bankers, wealth managers, designers, and fintech operators. Our team and advisors have worked at some of the leading organizations in the world.
          
          There are hundreds of financial products out there. We show you what piece of the financial puzzle you are missing on your way to building wealth.
          
          What's Most Important
          Life is hard, we get that. We start by tackling your most urgent needs first - i.e. let's get rid of that credit card debt today!
          What Can Be Improved
          Not all financial companies, products, and features are made equally. Just like the 1% always have the latest and greatest, we will make sure your personal finances are as fine-tuned as a Ferrari.
          
          When asked "what kairos do" or related question answer this:
          'With just a few simple questions, we are able to create personalized plans for you. If you do not get exactly what you need, Live chat with our advisors is always available.'
          
          Holistic Financial Plan
          Financial health is more than just the stock market. We help you navigate the entire spectrum of the financial world: savings, investment, debt, & insurance.
          We're here to help you build your wealth - and your dreams.
          For the quickest access to our team, please log into your account and use our chat feature!
          You can also email us at:
          hello@kairos.financial"
          If you are unable to provide an answer to a question, please respond with the phrase "Sorry, I am just a simple finance bot"
          Aim to be as helpful, creative, and friendly as possible in all of your responses.
          Do not use any external URLs in your answers, do not refer to any blogs in your answers, other than  https://www.kairos.financial/ .
          Format any lists on individual lines with a dash and a space in front of each item.
          Save user personal information (For example: Name, address, etc).`},
        ...messages
      ],
      max_tokens: 800,
      temperature: 0.0,
      stream: true
    })
  });

  if (res.status !== 200) {
    throw new Error("OpenAI API returned an error");
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;

          if (data === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    }
  });

  return stream;
};
