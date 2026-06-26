import { useEffect, useState } from 'react'
import './App.css'

type CheckType = 'safe' | 'agent-first' | 'agent-second' | 'agent-third' | string

type CheckResponse = {
  username: string
  loginUrl: string
  type?: CheckType
  otp?: string
}

function App() {
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [account, setAccount] = useState('')
  const [link, setLink] = useState('')
  const [errors, setErrors] = useState({ account: false, link: false })
  const [linkErrorType, setLinkErrorType] = useState<'empty' | 'invalid'>('empty')
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [nextStep, setNextStep] = useState<'otp' | 'result' | null>(null)
  const [showProcessing, setShowProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [inputMode, setInputMode] = useState<'link' | 'select'>('link')
  const [showCasinoModal, setShowCasinoModal] = useState(false)
  const [casinoSearch, setCasinoSearch] = useState('')

  const casinos = [
    'MM88','GG88', 'XX88', 'RR88', 'J88', 'AE888', 'WW88', 'FUN88', 'MU88', 'MB66', 'CM88', 'OK8386', 'OPEN88', 'C168', 'SC88', 'FLY88', '8KBET','JUN88', '78WIN', 'BL555', 'AU88', 'DF999', '789BET', 'HI88', 'SHBET',
    'F8BET', 'QQ88', 'NEW88', 'KUBET', 'LUCKY88', 'go88', 'sunwin', 'ok9', 'f168',
    'gk88', '6623', 's8', 'u888', 'sodo'
  ]

  const filteredCasinos = casinos.filter(casino =>
    casino.toLowerCase().includes(casinoSearch.toLowerCase())
  )

  const getResultPillText = () => {
    if (isAgentType()) return 'Cảnh báo ! Tài khoản dính mã ẩn nặng !'
    return 'TÀI KHOẢN AN TOÀN'
  }

  const isAgentType = () => {
    const type = (checkResult?.type ?? 'safe').toLowerCase()
    return type === 'agent-first' || type === 'agent-second' || type === 'agent-third'
  }

  const isValidUrl = (string: string): boolean => {
    try {
      const url = new URL(string)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      // Nếu không phải URL đầy đủ, kiểm tra xem có bắt đầu bằng http:// hoặc https:// không
      const trimmed = string.trim()
      return trimmed.startsWith('http://') || trimmed.startsWith('https://')
    }
  }

  const handleCheck = async () => {
    if (isChecking) return

    const hasAccount = account.trim() !== ''
    const hasLink = link.trim() !== ''

    // Kiểm tra nếu chế độ nhập link thì phải là URL hợp lệ
    const isLinkValid = inputMode === 'link' ? isValidUrl(link.trim()) : true

    if (!hasAccount || !hasLink || !isLinkValid) {
      if (inputMode === 'link' && hasLink && !isLinkValid) {
        setLinkErrorType('invalid')
      } else if (!hasLink) {
        setLinkErrorType('empty')
      }
      setErrors({
        account: !hasAccount,
        link: !hasLink || (inputMode === 'link' && !isLinkValid),
      })
      return
    }

    setErrors({ account: false, link: false })
    setCheckResult(null)
    setApiError(null)
    setIsChecking(true)
    setShowResult(false)
    setShowOtpModal(false)
    setNextStep(null)
    setOtpInput('')
    setOtpError(null)
    setProgress(0)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: account.trim(),
          loginUrl: link.trim(),
        }),
      })

      if (!res.ok) {
        // Cố gắng đọc message từ response
        try {
          const errJson = await res.json()
          const errorMessage = errJson?.message || errJson?.error || `HTTP ${res.status}`
          setApiError(errorMessage)
        } catch {
          setApiError(`HTTP ${res.status}: Có lỗi xảy ra khi kiểm tra tài khoản`)
        }
        setNextStep('result')
        return
      }

      const json = await res.json()
      const data = (json.data ?? json) as CheckResponse

      setCheckResult(data)
      // đánh dấu bước tiếp theo là mở OTP sau khi progress chạy xong
      setNextStep('otp')
    } catch (err) {
      console.error(err)
      // Nếu là lỗi network hoặc parse JSON, dùng message mặc định
      setApiError(
        'Hệ thống đang tạm thời gián đoạn khi kiểm tra tài khoản. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.'
      )
      // đánh dấu bước tiếp theo là hiển thị popup kết quả lỗi sau khi progress chạy xong
      setNextStep('result')
    } finally {
      // không tắt isChecking tại đây để cho thanh chạy hết 100%
    }
  }

  useEffect(() => {
    if (!isChecking) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        // cho sóng chạy dần tới 100%
        const next = Math.min(prev + 7, 100)
        if (next === 100) {
          clearInterval(interval)
        }
        return next
      })
    }, 120)

    return () => clearInterval(interval)
  }, [isChecking])

  // Khi progress đã chạy xong và API cũng đã trả về (có nextStep),
  // mới mở popup OTP hoặc popup kết quả.
  useEffect(() => {
    if (!nextStep || progress < 100) return

    setIsChecking(false)

    if (nextStep === 'otp') {
      setShowOtpModal(true)
    } else if (nextStep === 'result') {
      setShowResult(true)
    }

    setNextStep(null)
  }, [nextStep, progress])

  const handleCloseResult = () => {
    setShowResult(false)
  }

  const handleVerifyOtp = async () => {
    const trimmedOtp = otpInput.trim()

    // Không cho phép để trống OTP
    if (!trimmedOtp) {
      setOtpError('Vui lòng nhập OTP')
      return
    }

    // Call API /check/verify với username, loginUrl và OTP từ popup
    try {
      setIsVerifyingOtp(true)
      setOtpError(null)
      setApiError(null)

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/check/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: account.trim(),
          loginUrl: link.trim(),
          otp: trimmedOtp,
        }),
      })

      if (!res.ok) {
        // Cố gắng đọc message từ response của backend
        try {
          const errJson = await res.json()
          const errorMessage = errJson?.message || errJson?.error || 'OTP không hợp lệ hoặc đã hết hạn.'
          setOtpError(errorMessage)
        } catch {
          setOtpError('OTP không hợp lệ hoặc đã hết hạn.')
        }
        return
      }

      const json = await res.json()
      const data = (json.data ?? json) as CheckResponse

      setCheckResult(data)

      // Nếu backend trả thành công thì đóng popup OTP
      // và hiển thị modal "Hệ thống đang xâm nhập..." rồi mới show kết quả
      setShowOtpModal(false)
      setShowProcessing(true)
      setProcessingProgress(0)
    } catch (err) {
      console.error(err)
      setOtpError(
        'Hệ thống đang tạm thời gián đoạn khi xác thực OTP. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.'
      )
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Hiệu ứng modal "Hệ thống đang xâm nhập..."
  useEffect(() => {
    if (!showProcessing) return

    setProcessingProgress(0)

    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        // cho % chạy mượt tương tự nút TIẾN HÀNH KIỂM TRA
        const next = Math.min(prev + 7, 100)
        if (next === 100) {
          clearInterval(interval)
          setTimeout(() => {
            setShowProcessing(false)
            setShowResult(true)
          }, 400)
        }
        return next
      })
    }, 120)

    return () => clearInterval(interval)
  }, [showProcessing])

  return (
    <main className="app-container">
      <video
        className="app-video"
        src="/bg-pc.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      {/* Title Image - Top of page */}
      <div className="title-image-wrapper">
        <img
          src="/text-title.png"
          alt="CHECK MÃ ĐẠI LÝ"
          className="title-image"
        />
      </div>

      <div className="app-content">
        {/* Modal Form */}
        <div className="modal">
          <div className="modal-binary-overlay" aria-hidden />
          <div className="modal-inner">
            <div className="popup-title-row modal-banner">
              <div className="popup-title-row-start">
                <img src="/three-dots.png" alt="" className="popup-dots" aria-hidden />
              </div>
              <h2 className="modal-banner-text popup-title-center">CHECK MÃ ĐẠI LÝ</h2>
              <div className="popup-title-row-end" aria-hidden="true" />
            </div>

            <div className="modal-form">
            {/* Input 1: Tài khoản */}
            <div
              className={`form-group ${errors.account ? 'form-group-error' : ''
                }`}
            >
              <div className="form-label-row">
                <label className="form-label">
                  &gt;&gt;[USER_ID]::MÃ NGƯỜI CHƠI/ID TÀI KHOẢN
                </label>
                {errors.account && (
                  <span className="input-error-text">Vui lòng nhập tài khoản</span>
                )}
              </div>
              <div className="input-wrapper">
                <input
                  type="text"
                  className={`form-input ${errors.account ? 'form-input--error' : ''
                    }`}
                  placeholder={
                    errors.account
                      ? 'Vui lòng nhập tài khoản'
                      : 'Nhập tên đăng nhập'
                  }
                  value={account}
                  onChange={(e) => {
                    const value = e.target.value
                    setAccount(value)
                    if (errors.account && value.trim() !== '') {
                      setErrors((prev) => ({ ...prev, account: false }))
                    }
                  }}
                />
                {errors.account && (
                  <span className="input-error-icon">!</span>
                )}
              </div>
            </div>

            {/* Input 2: Link đăng nhập nhà cái */}
            <div
              className={`form-group ${errors.link ? 'form-group-error' : ''
                }`}
            >
              <div className="form-label-row">
                <label className="form-label">
                  &gt;&gt;[LOGIN_URL]::LINK ĐĂNG NHẬP NHÀ CÁI
                </label>
                {errors.link && (
                  <span className="input-error-text">
                    {linkErrorType === 'invalid'
                      ? 'Vui lòng nhập link hợp lệ (bắt đầu bằng http:// hoặc https://)'
                      : 'Vui lòng nhập link nhà cái'}
                  </span>
                )}
              </div>

              <div className="input-wrapper">
                <input
                  type="text"
                  className={`form-input ${errors.link ? 'form-input--error' : ''
                    }`}
                  placeholder={
                    inputMode === 'link'
                      ? (errors.link && linkErrorType === 'invalid'
                        ? 'Nhập link hợp lệ (http:// hoặc https://)'
                        : errors.link
                          ? 'Vui lòng nhập link nhà cái'
                          : 'Nhập link nhà cái')
                      : 'Chọn nhà cái'
                  }
                  value={link}
                  readOnly={inputMode === 'select'}
                  onChange={(e) => {
                    if (inputMode === 'link') {
                      const value = e.target.value
                      setLink(value)
                      if (errors.link) {
                        if (value.trim() === '') {
                          setLinkErrorType('empty')
                        } else if (isValidUrl(value.trim())) {
                          setErrors((prev) => ({ ...prev, link: false }))
                        } else {
                          setLinkErrorType('invalid')
                        }
                      }
                    }
                  }}
                  onClick={() => {
                    if (inputMode === 'select') {
                      setShowCasinoModal(true)
                    }
                  }}
                />
                {inputMode === 'link' ? (
                  <button
                    type="button"
                    className="paste-button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText()
                        setLink(text)
                        if (errors.link) {
                          setErrors((prev) => ({ ...prev, link: false }))
                        }
                      } catch (err) {
                        console.error('Failed to paste:', err)
                      }
                    }}
                  >
                    <svg
                      className="paste-button-icon"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    DÁN
                  </button>
                ) : (
                  <button
                    type="button"
                    className="select-casino-button"
                    onClick={() => setShowCasinoModal(true)}
                  >
                    CHỌN
                  </button>
                )}
                {errors.link && <span className="input-error-icon">!</span>}
              </div>

              <div className="input-mode-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${inputMode === 'link' ? 'active' : ''}`}
                  onClick={() => {
                    setInputMode('link')
                    setLink('')
                  }}
                >
                  NHẬP LINK
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${inputMode === 'select' ? 'active' : ''}`}
                  onClick={() => {
                    setInputMode('select')
                    setLink('')
                  }}
                >
                  CHỌN NHÀ CÁI
                </button>
              </div>
            </div>

            <button
              className={`form-button ${isChecking ? 'form-button-checking' : ''
                }`}
              onClick={handleCheck}
              disabled={isChecking}
            >
              <span className="form-button-label">
                {isChecking
                  ? `ĐANG CHECK... ${Math.round(progress)}%`
                  : '> BẮT ĐẦU CHECK <'}
              </span>
            </button>

            <div className="social-icons">
              <a
                href="https://t.me/TONTON2026VIP"
                target="_blank"
                rel="noopener noreferrer"
                className="social-pill social-pill--telegram"
              >
                <svg
                  className="social-pill-icon"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M21.5 4.5L2.7 11.1c-1.1.4-1.1 1.1-.2 1.4l5.1 1.6 1.9 5.8c.3.8.7.9 1.4.6l2.6-1.9 5.5 4c1 .6 1.7.3 1.9-1l3.5-16.5c.3-1.6-.6-2.3-1.7-1.8zM17.7 7.3l-9.8 9.2c-.4.4-.7.5-1 .3l2.6-7.7.01-.02c.01-.01.02-.03.03-.04l10.1-6.3c.5-.3.5-.06.06.24z" />
                </svg>
                Telegram
              </a>

              <a
                href="https://www.facebook.com/profile.php?id=100079535651669"
                target="_blank"
                rel="noopener noreferrer"
                className="social-pill social-pill--facebook"
              >
                <svg
                  className="social-pill-icon"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M13.5 22v-8.3h2.8l.4-3.3h-3.3V8.5c0-.9.3-1.6 1.6-1.6H17V4.1c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.9v2.8H6.5v3.3H9.5V22h4z" />
                </svg>
                facebook
              </a>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Verify Modal */}
      {showOtpModal && (
        <div className="otp-overlay">
          <div className="otp-modal">
            <div className="popup-title-row">
              <div className="popup-title-row-start">
                <img src="/three-dots.png" alt="" className="popup-dots" aria-hidden />
              </div>
              <h2 className="popup-title-center">XÁC THỰC OTP</h2>
              <div className="popup-title-row-end">
                <button
                  type="button"
                  className="otp-close"
                  onClick={() => {
                    setShowOtpModal(false)
                  }}
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="otp-body">
              <p className="otp-desc">
                Vui lòng nhập mã OTP để xem kết quả kiểm tra.
              </p>
              <input
                type="text"
                className="otp-input"
                placeholder="Nhập OTP"
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value)
                  if (otpError) {
                    setOtpError(null)
                  }
                }}
              />
              {otpError && <div className="otp-error-text">{otpError}</div>}
            </div>
            <div className="otp-actions">
              <button className="otp-button otp-button-cancel" onClick={() => setShowOtpModal(false)}>
                HỦY
              </button>
              <button
                className="otp-button otp-button-confirm"
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp}
              >
                {isVerifyingOtp ? 'ĐANG XÁC NHẬN...' : 'XÁC NHẬN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal (giữ nguyên, chỉ hiển thị sau khi xác thực OTP thành công) */}
      {showResult && (
        <div className="result-overlay" onClick={handleCloseResult}>
          <div
            className={`result-modal ${isAgentType() ? 'result-modal-danger' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="popup-title-row">
              <div className="popup-title-row-start">
                <img src="/three-dots.png" alt="" className="popup-dots" aria-hidden />
              </div>
              <h2 className="popup-title-center result-modal-heading">ĐÃ CHECK XONG</h2>
              <div className="popup-title-row-end" aria-hidden="true" />
            </div>

            <div className="result-icon-circle">
              <img
                src={isAgentType() ? "/danger.png" : "/done.png"}
                alt="Đã check xong"
                className="result-icon-image"
              />
            </div>

            {apiError && (
              <div className="result-error-text">{apiError}</div>
            )}

            {checkResult && !apiError && (
              <>
                <div className={`result-pill ${isAgentType() ? 'result-pill-danger' : ''}`}>
                  <span className="result-pill-text">{getResultPillText()}</span>
                </div>
                {checkResult.otp && (
                  <div className="result-text-bottom">
                    OTP: <strong>{checkResult.otp}</strong>
                  </div>
                )}
              </>
            )}

            <button
              className={`result-close-button ${isAgentType() ? 'result-close-button-danger' : ''}`}
              onClick={handleCloseResult}
            >
              {isAgentType() ? 'VUI LÒNG HUỶ' : 'ĐÓNG'}
            </button>
          </div>
        </div>
      )}
      {/* Processing Modal - Hệ thống đang xâm nhập */}
      {showProcessing && (
        <div className="processing-overlay">
          <div
            className="processing-modal"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="popup-title-row">
              <div className="popup-title-row-start">
                <img src="/three-dots.png" alt="" className="popup-dots" aria-hidden />
              </div>
              <h2 className="popup-title-center processing-check-heading">&gt;CHECK&lt;</h2>
              <div className="popup-title-row-end" aria-hidden="true" />
            </div>
            <div className="processing-body">
              <p className="processing-warning-text">
                TRONG LÚC KIỂM TRA THÔNG TIN
                <br />
                VUI LÒNG KHÔNG THOÁT RA
              </p>
              <div className="processing-dots" aria-hidden>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="processing-dot"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
              <div className="processing-progress-block">
                <span className="processing-progress-text">
                  HỆ THỐNG ĐANG XÂM NHẬP...{Math.round(processingProgress)}%
                </span>
              </div>
              <p className="processing-footer-text">ĐỢI TRẢ KẾT QUẢ...</p>
            </div>
          </div>
        </div>
      )}

      {/* Casino Selection Modal */}
      {showCasinoModal && (
        <div className="casino-modal-overlay" onClick={() => setShowCasinoModal(false)}>
          <div
            className="casino-modal"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="casino-modal-header popup-title-row">
              <div className="popup-title-row-start">
                <img src="/three-dots.png" alt="" className="popup-dots" aria-hidden />
              </div>
              <h2 className="casino-modal-title popup-title-center">Chọn nhà cái</h2>
              <div className="popup-title-row-end">
                <button
                  type="button"
                  className="casino-modal-close"
                  onClick={() => setShowCasinoModal(false)}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="casino-search-wrapper">
              <input
                type="text"
                className="casino-search-input"
                placeholder="Tìm kiếm nhà cái..."
                value={casinoSearch}
                onChange={(e) => setCasinoSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="casino-list">
              {filteredCasinos.length > 0 ? (
                filteredCasinos.map((casino) => (
                  <button
                    key={casino}
                    type="button"
                    className="casino-item"
                    onClick={() => {
                      setLink(casino)
                      setShowCasinoModal(false)
                      setCasinoSearch('')
                      if (errors.link) {
                        setErrors((prev) => ({ ...prev, link: false }))
                      }
                    }}
                  >
                    {casino}
                  </button>
                ))
              ) : (
                <div className="casino-no-results">Không tìm thấy nhà cái</div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
