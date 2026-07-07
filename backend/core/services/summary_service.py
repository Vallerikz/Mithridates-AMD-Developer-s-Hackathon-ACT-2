import os

from google import genai


client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY")
)


def summarize(sentences: list[str]) -> str:
    """
    Summarizes a list of transcribed sentences.

    Args:
        sentences: List of transcript sentences.

    Returns:
        Summary of the transcript.
    """
    if not sentences:
        return ""

    transcript = "\n".join(sentences)

    prompt = f"""
Summarize the following transcript.

Return only the summary.
Do not use markdown.
Do not include a title.

Transcript:

{transcript}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text.strip()
