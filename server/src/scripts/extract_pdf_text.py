import sys
from pathlib import Path

from pypdf import PdfReader


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: extract_pdf_text.py <pdf-path>")

    pdf_path = Path(sys.argv[1])
    reader = PdfReader(str(pdf_path))
    chunks = []

    for page in reader.pages:
      text = page.extract_text() or ""
      chunks.append(text)

    print("\n".join(chunks))


if __name__ == "__main__":
    main()
