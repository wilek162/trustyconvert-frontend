import os
import zipfile
import random
import string

# Create a large content block
def generate_large_content():
    content = []
    
    # Add many paragraphs of varying content
    for i in range(2000):  # This should generate substantial content
        section_num = i // 100 + 1
        para_num = i % 100 + 1
        
        # Generate random text content
        sentences = []
        for j in range(random.randint(3, 8)):
            words = []
            for k in range(random.randint(8, 20)):
                word_len = random.randint(3, 12)
                word = ''.join(random.choices(string.ascii_lowercase, k=word_len))
                words.append(word)
            sentences.append(' '.join(words).capitalize() + '.')
        
        paragraph_text = ' '.join(sentences)
        
        # Add paragraph with formatting
        content.append(f'''        <w:p>
            <w:pPr>
                <w:pStyle w:val="Normal"/>
            </w:pPr>
            <w:r>
                <w:t>Section {section_num}, Paragraph {para_num}: {paragraph_text} This content is generated to create a large document file for testing purposes. The text contains various combinations of words and sentences to simulate real document content while reaching the target file size.</w:t>
            </w:r>
        </w:p>''')
        
        # Add headings every 50 paragraphs
        if i % 50 == 0:
            content.append(f'''        <w:p>
            <w:pPr>
                <w:pStyle w:val="Heading2"/>
            </w:pPr>
            <w:r>
                <w:t>Section {section_num} - Subsection {i//50 + 1}</w:t>
            </w:r>
        </w:p>''')
    
    return '\n'.join(content)

# Generate the content
large_content = generate_large_content()

# Write to file
with open(r'C:\Users\ROG\FILE-CONVERTER\trustyconvert-frontend\docx_temp\large_content.xml', 'w', encoding='utf-8') as f:
    f.write(large_content)

print("Large content generated successfully")
