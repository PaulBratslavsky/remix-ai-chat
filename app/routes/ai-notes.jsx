import { Form, useActionData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useUser } from "~/utils";
import { getUserById } from "~/models/user.server";
import { requireUserId } from "~/session.server";
import { Configuration, OpenAIApi } from "openai";

export async function action({ request }) {
  const userId = await requireUserId(request);
  const currentUser = await getUserById(userId);

  const formData = await request.formData();
  const prompt = formData.get("prompt");
  const tokensCost = formData.get("tokensCost");

  const errors = {
    tokens:
      currentUser && Number(tokensCost) > currentUser.tokens
        ? "You don't have enough tokens"
        : null,
  };

  const hasErrors = Object.values(errors).some((error) => error !== null);

  if (hasErrors) {
    return json({
      data: null,
      errors,
    });
  }

  console.log(process.env.OPENAI_API_KEY, "process.env.OPENAI_API_KEY");

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const openai = new OpenAIApi(configuration);

  try {

    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: Number(tokensCost),
      temperature: 0.9,
      top_p: 1,
      frequency_penalty: 0.52,
      presence_penalty: 0.9,
      n: 1,
      best_of: 2,
      stream: false,
      logprobs: null,
    });

    console.log(completion.data, "completion.data");

    return json({
      data: completion.data,
      error: null,
    });
  } catch (error) {
    console.log(error);
    return json({
      data: null,
      error: error,
    });
  }
}

export async function loader({ request }) {
  const userId = await requireUserId(request);
  return json({
    userId,
  });
}

function ShowErrors({ errors }) {
  return (
    <ul className="my-4 rounded-md bg-red-500 px-3 py-1 text-white">
      {Object.entries(errors).map(([key, error]) => (
        <li key={key}>{error}</li>
      ))}
    </ul>
  );
}

const CodeBlock = ({ choices }) => {
  return (
    <div>
      {choices.map(choice => (
        <pre key={choice.index}>
          {choice.text}
        </pre>
      ))}
    </div>
  );
};

export default function AiNotesRoute() {
  const user = useUser();
  const data = useActionData();

  console.log(data);

  return (
    <div className="container mx-auto min-h-screen overflow-scroll">
      <nav className="sticky top-0 z-10 my-2 flex w-full items-center justify-between rounded-md bg-white p-4 text-white dark:bg-gray-800">
        <h1 className="text-xl font-bold">AI Notes</h1>
        <Form action="/logout" method="post">
          <button
            type="submit"
            className="rounded bg-slate-600 py-2 px-4 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
          >
            Logout
          </button>
        </Form>
      </nav>
      {/* Create a text input using remix js styled with tailwind */}
      <div className="flex h-full w-full flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold">AI Generated Text</h1>
        <p className="text-xl">Type in your prompt bellow.</p>
        <p>
          You have{" "}
          <span className="rounded-md bg-teal-500 px-3 py-1 font-semibold text-white">
            {user.tokens}
          </span>{" "}
          remaining.
        </p>
        <Form method="post" className="my-6 w-3/4">
          <div className="mb-2 flex items-center justify-center">
            <input
              className="mr-2 w-full rounded-md border border-gray-300 p-2 dark:bg-gray-800 dark:text-white"
              name="prompt"
              placeholder="Enter your promt"
            />

            <button
              className="rounded-md bg-teal-500 px-6 py-2 text-white"
              type="submit"
            >
              Send
            </button>
          </div>
          <input
            className="w-1/4 rounded-md bg-teal-500 px-6 py-2 text-white"
            type="number"
            name="tokensCost"
            defaultValue={1000}
          />
          {data?.errors && <ShowErrors errors={data?.errors} />}
        </Form>
        {data?.data?.choices && (
          <div className="w-3/4">
            <h1 className="text-xl font-bold">AI Generated Text</h1>
            <div>
              <h2>Usage</h2>
              {/* loop through the keys and display value */}
              {Object.keys(data.data.usage).map((key, index) => {
                return (
                  <p key={index}>
                    {key}: {data.data.usage[key]}
                  </p>
                );
              })}
            </div>
            <CodeBlock choices={data.data.choices} />
            {/* {data?.data?.choices.map((choice, index) => {
              return (
                <div className="my-4" key={index}>
                  <p className="text-xl">{choice.text}</p>
                </div>
              );
            })} */}
          </div>
        )}
      </div>
    </div>
  );
}




// curl https://api.openai.com/v1/completions \
//   -H 'Content-Type: application/json' \
//   -H 'Authorization: Bearer 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' \
//   -d '{
//     "model": "text-davinci-003",
//     "prompt": "tell me a stroy",
//     "max_tokens": 1000,
//     "temperature": 0.9,
//     "top_p": 1,
//     "frequency_penalty": 0.52,
//     "presence_penalty": 0.9,
//     "n": 1,
//     "best_of": 2,
//     "stream": false,
//     "logprobs": null
// }'