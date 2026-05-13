import { useState, useEffect, useRef } from 'react'
import { listBooks, uploadBook, deleteBook, getBook, zipUrl } from '../api'

const STATUS_TITLE = { PARSING: 'Converting', READY: 'Ready', FAILED: 'Failed' }

export default function BookList() {
  const [books, setBooks] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => { refresh() }, [])

  // Poll parsing books
  useEffect(() => {
    const parsing = books.filter(b => b.status === 'PARSING')
    if (parsing.length === 0) return
    const id = setTimeout(async () => {
      const updated = await Promise.all(
        parsing.map(b => getBook(b.id).catch(() => b))
      )
      setBooks(prev =>
        prev.map(b => {
          const u = updated.find(x => x.id === b.id)
          return u ? u : b
        })
      )
    }, 2000)
    return () => clearTimeout(id)
  }, [books])

  async function refresh() {
    try {
      setBooks(await listBooks())
    } catch (e) {
      console.error(e)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const { book_id } = await uploadBook(file)
      const newBook = { id: book_id, title: file.name, author: '', status: 'PARSING' }
      setBooks(prev => [newBook, ...prev])
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  async function handleDelete(bookId) {
    if (!confirm('Delete this file?')) return
    await deleteBook(bookId)
    setBooks(prev => prev.filter(b => b.id !== bookId))
  }

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes statusPulse { 0%,100% { opacity: 0.35 } 50% { opacity: 1 } }
        .status-pulse { animation: statusPulse 1.4s ease-in-out infinite; }
      `}</style>
      <header style={styles.header}>
        <h1 style={styles.title}>marker-pipeline</h1>
        <button style={styles.uploadBtn} onClick={() => fileRef.current.click()} disabled={uploading} title="Add file">
          {uploading ? '…' : '+'}
        </button>
        <input ref={fileRef} type="file" accept=".epub,.pdf" style={{ display: 'none' }} onChange={handleUpload} />
      </header>

      <div style={styles.grid}>
        {books.length === 0 && (
          <p style={styles.empty}>No files yet. Upload an EPUB or PDF to convert.</p>
        )}
        {books.map(book => (
          <div key={book.id} style={styles.card}>
            <div style={styles.cardBody}>
              <div style={styles.bookIcon}>📄</div>
              <div style={styles.cardInfo}>
                <div style={styles.bookTitle}>{book.title}</div>
                {book.author && <div style={styles.bookAuthor}>{book.author}</div>}
              </div>
            </div>
            <div style={styles.actions}>
              {book.status === 'PARSING' && (
                <span className="status-pulse" style={styles.statusGlyph} title={STATUS_TITLE.PARSING}>○</span>
              )}
              {book.status === 'READY' && (
                <a href={zipUrl(book.id)} style={styles.downloadBtn} download title={STATUS_TITLE.READY}>
                  ↓
                </a>
              )}
              {book.status === 'FAILED' && (
                <span style={styles.statusGlyph} title={STATUS_TITLE.FAILED}>!</span>
              )}
              <button style={styles.deleteBtn} onClick={() => handleDelete(book.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: { maxWidth: 720, margin: '0 auto', padding: '24px 16px' },
  header: { display: 'flex', alignItems: 'center', marginBottom: 28 },
  title: { flex: 1, fontSize: 24, fontWeight: 700, letterSpacing: -0.5, color: '#e8e3d9', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  uploadBtn: {
    background: '#c79968', color: '#1c1c1e', border: 'none',
    borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 22, fontWeight: 700,
    lineHeight: 1, minWidth: 40,
  },
  grid: { display: 'flex', flexDirection: 'column', gap: 12 },
  empty: { color: '#636366', textAlign: 'center', marginTop: 60 },
  card: {
    display: 'flex', alignItems: 'center',
    background: '#2c2c2e', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  cardBody: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' },
  bookIcon: { fontSize: 32 },
  cardInfo: { flex: 1, minWidth: 0 },
  bookTitle: { fontSize: 16, fontWeight: 600, marginBottom: 2, color: '#e8e3d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  bookAuthor: { fontSize: 13, color: '#aeaeb2', marginBottom: 4 },
  actions: { display: 'flex', alignItems: 'center', gap: 8, paddingRight: 16, flexShrink: 0 },
  statusGlyph: {
    color: '#636366', fontSize: 20, fontWeight: 700, lineHeight: 1,
    padding: '4px 8px', cursor: 'default', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  downloadBtn: {
    color: '#c79968', fontSize: 20, fontWeight: 700, lineHeight: 1,
    textDecoration: 'none', cursor: 'pointer', padding: '4px 8px',
  },
  deleteBtn: {
    background: 'none', border: 'none', color: '#636366',
    fontSize: 16, padding: '12px', cursor: 'pointer',
  },
}
