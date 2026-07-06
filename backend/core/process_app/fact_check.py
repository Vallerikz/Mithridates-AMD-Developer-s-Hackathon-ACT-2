import random

VERDICTS = ['True', 'False', 'Unverifiable']


def transcribe_chunk(audio_chunk):
    # TODO: swap in the real STT once it's merged
    return "This is a placeholder transcript."


def split_into_sentences(text):
    return [s.strip() for s in text.split('.') if s.strip()]


def check_sentences(sentences):
    results = []
    for sentence in sentences:
        results.append({
            'sentence': sentence,
            'verdict': random.choice(VERDICTS),
            'confidence': round(random.uniform(0.5, 0.99), 2),
            'explanation': 'stub result, LLM call not plugged in yet'
        })
    return results
