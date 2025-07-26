import { useEffect } from 'hono/jsx'

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      // スクロール位置を保存
      const scrollY = window.scrollY
      
      // bodyの現在のスタイルを保存
      const body = document.body
      const originalStyle = {
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
        overflow: body.style.overflow,
      }
      
      // スクロールを無効化
      body.style.position = 'fixed'
      body.style.top = `-${scrollY}px`
      body.style.width = '100%'
      body.style.overflow = 'hidden'
      
      // クリーンアップ関数
      return () => {
        // 元のスタイルを復元
        body.style.position = originalStyle.position
        body.style.top = originalStyle.top
        body.style.width = originalStyle.width
        body.style.overflow = originalStyle.overflow
        
        // スクロール位置を復元
        window.scrollTo(0, scrollY)
      }
    }
  }, [isLocked])
}