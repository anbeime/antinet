# coding=utf-8
from docx import Document
import sys

doc = Document(r'C:\D\PP-Structure工具包：PDF图片表格一键提取解决方案.docx')
for p in doc.paragraphs[:25]:
    if p.text.strip():
        print(p.text)