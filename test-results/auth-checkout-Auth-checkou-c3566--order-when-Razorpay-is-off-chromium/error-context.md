# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-checkout.spec.ts >> Auth & checkout >> register, login, checkout creates pending order when Razorpay is off
- Location: tests/e2e/auth-checkout.spec.ts:4:7

# Error details

```
TimeoutError: browserType.launch: Timeout 180000ms exceeded.
Call log:
  - <launching> /var/folders/vz/h3xjtgd97fn39tzstxrrcj380000gn/T/cursor-sandbox-cache/4540acfd2893665df32dd8bd4d976b1b/playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-x64/chrome-headless-shell --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --enable-automation --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=/var/folders/vz/h3xjtgd97fn39tzstxrrcj380000gn/T/playwright_chromiumdev_profile-RQrbzj --remote-debugging-pipe --no-startup-window
  - <launched> pid=796
  - [pid=796][err] Received signal 11 SEGV_MAPERR 000000000010
  - [pid=796][err]  [0x000105ce12c3]
  - [pid=796][err]  [0x000105ce5103]
  - [pid=796][err]  [0x7ff81c06537d]
  - [pid=796][err]  [0x00000000010b]
  - [pid=796][err]  [0x000102993065]
  - [pid=796][err]  [0x000102356061]
  - [pid=796][err]  [0x00010256c176]
  - [pid=796][err]  [0x000103d049b2]
  - [pid=796][err]  [0x000103d059dc]
  - [pid=796][err]  [0x00020aad7781]
  - [pid=796][err] [end of stack trace]

```