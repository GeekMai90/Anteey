import { TextChunk } from '../../renderer/src/types/semantic'
import log from 'electron-log'

interface ChunkOptions {
  maxChunkSize: number
  minChunkSize: number
  overlap: number
  splitRules: {
    byParagraph: boolean
    bySentence: boolean
    byMarkdownHeader: boolean
  }
}

export class TextProcessor {
  private static instance: TextProcessor

  public static getInstance(): TextProcessor {
    if (!TextProcessor.instance) {
      TextProcessor.instance = new TextProcessor()
    }
    return TextProcessor.instance
  }

  // 主分块方法
  public splitIntoChunks(
    text: string,
    options: ChunkOptions = this.getDefaultOptions()
  ): TextChunk[] {
    try {
      // 1. Markdown 结构处理
      const sections = this.splitByMarkdown(text)

      // 2. 段落分割
      const paragraphs = sections.flatMap((section) => this.splitByParagraph(section))

      // 3. 大段落再分割
      const rawChunks = paragraphs.flatMap((paragraph) =>
        this.splitLongParagraph(paragraph, options)
      )

      // 4. 添加重叠
      const chunks = this.addOverlap(rawChunks, options.overlap)

      // 5. 清理和标准化
      return this.normalizeChunks(chunks)
    } catch (error) {
      log.error('TextProcessor: 文本分块失败:', error)
      throw error
    }
  }

  private splitByMarkdown(text: string): string[] {
    const headers = /^#{1,6}\s.+$/gm
    return text.split(headers).filter((section) => section.trim().length > 0)
  }

  private splitByParagraph(text: string): string[] {
    return text.split(/\n{2,}/).filter((para) => para.trim().length > 0)
  }

  private splitLongParagraph(text: string, options: ChunkOptions): TextChunk[] {
    if (text.length <= options.maxChunkSize) {
      return [
        {
          text,
          metadata: {
            startPos: 0,
            endPos: text.length
          }
        }
      ]
    }

    // 按句子分割
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    const chunks: TextChunk[] = []
    let currentChunk = ''
    let startPos = 0

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > options.maxChunkSize) {
        if (currentChunk.length >= options.minChunkSize) {
          chunks.push({
            text: currentChunk.trim(),
            metadata: {
              startPos,
              endPos: startPos + currentChunk.length
            }
          })
        }
        currentChunk = sentence
        startPos = text.indexOf(sentence)
      } else {
        currentChunk += sentence
      }
    }

    if (currentChunk.length >= options.minChunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          startPos,
          endPos: startPos + currentChunk.length
        }
      })
    }

    return chunks
  }

  private addOverlap(chunks: TextChunk[], overlap: number): TextChunk[] {
    return chunks.map((chunk, index) => {
      if (index === 0) return chunk

      const prevChunk = chunks[index - 1]
      const overlapText = prevChunk.text.slice(-overlap)

      return {
        text: overlapText + chunk.text,
        metadata: {
          ...chunk.metadata,
          startPos: chunk.metadata.startPos - overlap
        }
      }
    })
  }

  private normalizeChunks(chunks: TextChunk[]): TextChunk[] {
    return chunks.map((chunk) => ({
      text: chunk.text.replace(/\s+/g, ' ').trim(),
      metadata: chunk.metadata
    }))
  }

  private getDefaultOptions(): ChunkOptions {
    return {
      maxChunkSize: 512,
      minChunkSize: 100,
      overlap: 50,
      splitRules: {
        byParagraph: true,
        bySentence: true,
        byMarkdownHeader: true
      }
    }
  }
}
