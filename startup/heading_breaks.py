"""Headings use <br> for desktop line breaks; phones hide them, so each break needs a space before it."""
import re

HEADING = re.compile(r'<(h[1-3])\b([^>]*)>(.*?)</\1>', re.S)


def heading_breaks(html: str) -> str:
    return HEADING.sub(lambda m: f'<{m[1]}{m[2]}>' + re.sub(r'(?<=\S)<br>', ' <br>', m[3]) + f'</{m[1]}>', html)
