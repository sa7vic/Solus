"""
BM25 full-text index — genuine lexical ranking (K1=1.5, B=0.75).
Pure Python, no external dependencies beyond rank-bm25.
"""
import re
from rank_bm25 import BM25Okapi


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


class BM25Index:
    def __init__(self, docs: list[dict]):
        """docs: list of {id, source, text}"""
        self.docs = docs
        tokenized = [_tokenize(d["text"]) for d in docs]
        self._bm25 = BM25Okapi(tokenized, k1=1.5, b=0.75)

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        if not self.docs:
            return []
        q_tokens = _tokenize(query)
        scores = self._bm25.get_scores(q_tokens)
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        results = []
        for idx, score in ranked[:top_k]:
            if score <= 0:
                break
            results.append({"doc": self.docs[idx], "score": round(float(score), 4)})
        return results
