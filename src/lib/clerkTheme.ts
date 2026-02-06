// Clerk theme configuration matching the brutalist design system
export const clerkAppearance = {
  variables: {
    colorPrimary: 'hsl(0, 0%, 9%)',
    colorTextOnPrimaryBackground: 'hsl(0, 0%, 100%)',
    colorBackground: 'hsl(0, 0%, 100%)',
    colorText: 'hsl(0, 0%, 9%)',
    colorTextSecondary: 'hsl(0, 0%, 45%)',
    colorInputBackground: 'hsl(0, 0%, 100%)',
    colorInputText: 'hsl(0, 0%, 9%)',
    borderRadius: '12px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontSize: '14px',
  },
  elements: {
    // Root container
    rootBox: 'w-full',
    card: 'bg-card border border-border shadow-none rounded-2xl',
    
    // Header
    headerTitle: 'text-foreground text-xl font-bold tracking-tight',
    headerSubtitle: 'text-muted-foreground text-sm',
    
    // Form elements
    formButtonPrimary: 
      'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] ' +
      'rounded-xl py-3 text-sm font-semibold transition-all duration-150 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed',
    formButtonReset: 'text-muted-foreground hover:text-foreground text-sm',
    formFieldInput: 
      'bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground ' +
      'placeholder:text-muted-foreground ' +
      'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
    formFieldLabel: 'text-xs text-muted-foreground uppercase tracking-wide font-medium',
    formFieldAction: 'text-primary text-sm hover:opacity-80',
    formFieldInputShowPasswordButton: 'text-muted-foreground hover:text-foreground',
    formFieldErrorText: 'text-destructive text-xs mt-1',
    
    // Footer
    footer: 'hidden',
    footerAction: 'hidden',
    footerActionLink: 'text-primary hover:opacity-80 text-sm font-medium',
    footerActionText: 'text-muted-foreground text-sm',
    
    // Divider
    dividerLine: 'bg-border',
    dividerText: 'text-muted-foreground text-xs uppercase tracking-wide',
    
    // Social buttons
    socialButtonsBlockButton: 
      'border border-border bg-background text-foreground rounded-xl py-3 ' +
      'hover:bg-muted transition-colors font-medium',
    socialButtonsBlockButtonText: 'text-foreground text-sm font-medium',
    socialButtonsBlockButtonArrow: 'text-muted-foreground',
    
    // Identity preview (user info display)
    identityPreview: 'bg-muted/50 rounded-xl p-3 border border-border',
    identityPreviewText: 'text-foreground text-sm',
    identityPreviewEditButton: 'text-primary text-sm hover:opacity-80',
    
    // OTP input
    otpCodeFieldInput: 'border border-border rounded-lg bg-background text-foreground text-center',
    
    // Alert
    alert: 'bg-muted border border-border rounded-xl',
    alertText: 'text-foreground text-sm',
    
    // User button (avatar dropdown)
    userButtonBox: 'w-8 h-8',
    userButtonTrigger: 'rounded-full focus:ring-2 focus:ring-ring',
    userButtonAvatarBox: 'w-8 h-8 rounded-full',
    userButtonPopoverCard: 'bg-card border border-border rounded-xl shadow-lg',
    userButtonPopoverActions: 'p-2',
    userButtonPopoverActionButton: 
      'text-foreground hover:bg-muted rounded-lg transition-colors w-full text-left px-3 py-2',
    userButtonPopoverActionButtonText: 'text-foreground text-sm',
    userButtonPopoverActionButtonIcon: 'text-muted-foreground',
    userButtonPopoverFooter: 'hidden',
    
    // User profile
    profilePage: 'p-0',
    profileSection: 'bg-muted/30 rounded-xl p-4 border border-border',
    profileSectionTitle: 'text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-3',
    profileSectionContent: 'space-y-3',
    profileSectionPrimaryButton: 
      'bg-primary text-primary-foreground hover:opacity-90 rounded-xl py-2.5 px-4 text-sm font-semibold',
    
    // Navigation
    navbarButton: 'text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-2',
    navbarButtonIcon: 'w-5 h-5',
    
    // Page background
    pageScrollBox: 'p-0',
    
    // Badge
    badge: 'bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full',
    
    // Form header
    formHeaderTitle: 'text-xl font-bold text-foreground',
    formHeaderSubtitle: 'text-sm text-muted-foreground',
    
    // Verification
    verificationLinkStatusBox: 'bg-muted/50 rounded-xl p-4 border border-border',
  },
};

// Dark mode overrides
export const clerkDarkAppearance = {
  ...clerkAppearance,
  variables: {
    ...clerkAppearance.variables,
    colorPrimary: 'hsl(0, 0%, 95%)',
    colorTextOnPrimaryBackground: 'hsl(0, 0%, 9%)',
    colorBackground: 'hsl(0, 0%, 12%)',
    colorText: 'hsl(0, 0%, 95%)',
    colorTextSecondary: 'hsl(0, 0%, 55%)',
    colorInputBackground: 'hsl(0, 0%, 7%)',
    colorInputText: 'hsl(0, 0%, 95%)',
  },
};
