from core.process_app import fireworks_client


def transcribe_chunk(audio_chunk):
    # TODO: swap in the real STT once it's merged
    return "This is a placeholder transcript."


def split_into_sentences(text):
    return [s.strip() for s in text.split('.') if s.strip()]


def check_sentences(sentences):
    return fireworks_client.fact_check_sentences(sentences)
