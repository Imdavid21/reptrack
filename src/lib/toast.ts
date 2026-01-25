 // Simple toast replacement to avoid React hooks issues
 export const toast = {
   success: (message: string) => console.log('✓', message),
   error: (message: string) => console.error('✗', message),
   info: (message: string) => console.info('ℹ', message),
 };