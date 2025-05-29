// Enhanced Single Page Application Navigation System
// シングルページアプリケーション拡張ナビゲーションシステム

document.addEventListener("DOMContentLoaded", function() {
    // Cache management objects
    // キャッシュ管理オブジェクト
    const pathToHashMap = {}; // File path to hash mapping / ファイルパスからハッシュへのマッピング
    const contentCache = new Map(); // Content cache with timestamps / タイムスタンプ付きコンテンツキャッシュ
    const fileHashCache = new Map(); // File hash cache for cache busting / キャッシュバスティング用ファイルハッシュキャッシュ
    
    // Configuration settings
    // 設定
    const CONFIG = {
        cacheTimeout: 5 * 60 * 1000, // 5 minutes in milliseconds / 5分（ミリ秒）
        enableMemoryCache: true, // Enable in-memory caching / メモリキャッシュを有効化
        enableCacheBusting: true, // Enable cache busting / キャッシュバスティングを有効化
        maxCacheSize: 50 // Maximum number of cached items / キャッシュアイテムの最大数
    };

    // Disable right-click context menu and show custom menu
    // 右クリックメニューを無効化してカスタムメニューを表示
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        
        // Generic custom menu handling - checks if custom menu exists
        // 汎用的なカスタムメニュー処理 - カスタムメニューの存在をチェック
        const customMenu = document.getElementById('custom-menu');
        if (customMenu) {
            customMenu.style.display = 'block';
            customMenu.style.left = e.pageX + 'px';
            customMenu.style.top = e.pageY + 'px';
        }
    });

    // Hide custom menu when clicking elsewhere
    // 他の場所をクリックしたときにカスタムメニューを非表示
    document.addEventListener('click', function(e) {
        const customMenu = document.getElementById('custom-menu');
        if (customMenu && !customMenu.contains(e.target)) {
            customMenu.style.display = 'none';
        }
    });

    /**
     * Show the selected page and hide others
     * 選択されたページを表示し、他を非表示にする
     * @param {string} pageId - The ID of the page to show / 表示するページのID
     */
    window.showPage = function(pageId) {
        const pages = document.querySelectorAll('.tab-content');
        pages.forEach(page => {
            page.style.display = 'none';
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
        }
    };

    /**
     * Check if a file exists with cache busting
     * キャッシュバスティング付きでファイルの存在を確認
     * @param {string} url - The URL to check / チェックするURL
     * @returns {Promise<boolean>} - True if file exists / ファイルが存在する場合true
     */
    async function fileExists(url) {
        try {
            const bustUrl = CONFIG.enableCacheBusting ? addCacheBuster(url) : url;
            const response = await fetch(bustUrl, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.error('Error checking if file exists:', error);
            return false;
        }
    }

    /**
     * Add cache buster parameter to URL
     * URLにキャッシュバスター・パラメータを追加
     * @param {string} url - Original URL / 元のURL
     * @returns {string} - URL with cache buster / キャッシュバスター付きURL
     */
    function addCacheBuster(url) {
        if (!CONFIG.enableCacheBusting) return url;
        
        const separator = url.includes('?') ? '&' : '?';
        const timestamp = Date.now();
        return `${url}${separator}_cb=${timestamp}`;
    }

    /**
     * Generate simple hash for content comparison
     * コンテンツ比較用の簡単なハッシュを生成
     * @param {string} content - Content to hash / ハッシュ化するコンテンツ
     * @returns {string} - Simple hash / 簡単なハッシュ
     */
    function simpleHash(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Clean old cache entries to prevent memory overflow
     * メモリオーバーフローを防ぐために古いキャッシュエントリを削除
     */
    function cleanOldCache() {
        if (contentCache.size <= CONFIG.maxCacheSize) return;
        
        const entries = Array.from(contentCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Remove oldest entries / 最も古いエントリを削除
        const toRemove = entries.slice(0, entries.length - CONFIG.maxCacheSize);
        toRemove.forEach(([key]) => {
            contentCache.delete(key);
            fileHashCache.delete(key);
        });
    }

    /**
     * Get cached content if valid
     * 有効な場合はキャッシュされたコンテンツを取得
     * @param {string} filePath - File path / ファイルパス
     * @returns {Object|null} - Cached content or null / キャッシュされたコンテンツまたはnull
     */
    function getCachedContent(filePath) {
        if (!CONFIG.enableMemoryCache) return null;
        
        const cached = contentCache.get(filePath);
        if (!cached) return null;
        
        const now = Date.now();
        if (now - cached.timestamp > CONFIG.cacheTimeout) {
            contentCache.delete(filePath);
            fileHashCache.delete(filePath);
            return null;
        }
        
        return cached;
    }

    /**
     * Set content in cache
     * コンテンツをキャッシュに設定
     * @param {string} filePath - File path / ファイルパス
     * @param {string} content - Content to cache / キャッシュするコンテンツ
     * @param {string} hash - Content hash / コンテンツハッシュ
     */
    function setCachedContent(filePath, content, hash) {
        if (!CONFIG.enableMemoryCache) return;
        
        cleanOldCache();
        
        contentCache.set(filePath, {
            content: content,
            timestamp: Date.now(),
            hash: hash
        });
        
        fileHashCache.set(filePath, hash);
    }

    /**
     * Display fallback 404 error message
     * フォールバック404エラーメッセージを表示
     * @param {string} elementId - Target element ID / ターゲット要素ID
     * @returns {boolean} - Always returns false / 常にfalseを返す
     */
    function showFallbackErrorMessage(elementId) {
        const element = document.getElementById(elementId) || document.getElementById('home');
        if (element) {
            element.innerHTML = `
                <div class="error-container" style="max-width: 800px; margin: 50px auto; padding: 20px; border: 1px solid #e74c3c; border-radius: 5px; background-color: #1e1e1e;">
                    <h1 style="color: #e74c3c;">Page Not Found (404)</h1>
                    <p>We apologize, but the page you're looking for could not be found.</p>
                    <div style="margin-top: 20px; padding: 15px; background-color: #3f3f3f; border-left: 4px solid #3498db; border-radius: 3px;">
                        <h3>Possible Causes:</h3>
                        <ul>
                            <li>Typo in URL</li>
                            <li>Page moved or deleted</li>
                            <li>Page file missing or inaccessible</li>
                        </ul>
                        <h3>Solutions:</h3>
                        <ul>
                            <li>Please verify that the URL is correct</li>
                            <li><a href="#home" style="color: #3498db; text-decoration: underline;">Return to Homepage</a></li>
                            <li>Contact site administrator to check if the page exists</li>
                        </ul>
                    </div>
                </div>
            `;
        }
        
        showPage(elementId);
        history.replaceState(null, '', '#404');
        updatePageTitle('404');
        
        return false;
    }

    /**
     * Load and display Markdown content with caching and 404 handling
     * キャッシュと404処理付きでMarkdownコンテンツを読み込み表示
     * @param {string} filePath - Path to the markdown file / Markdownファイルのパス
     * @param {string} elementId - Target element ID / ターゲット要素ID
     * @param {string} originalHash - Original URL hash / 元のURLハッシュ
     * @returns {Promise<boolean>} - Success status / 成功ステータス
     */
    async function loadMarkdown(filePath, elementId, originalHash) {
        try {
            const is404Page = filePath === 'public/404.md';
            
            // Check cache first / まずキャッシュをチェック
            const cached = getCachedContent(filePath);
            
            // Check if file exists / ファイルの存在を確認
            const exists = await fileExists(filePath);
            
            if (!exists) {
                console.log(`File does not exist: ${filePath}, loading 404 page`);
                
                if (!is404Page) {
                    return await loadMarkdown('public/404.md', elementId, '404');
                } else {
                    return showFallbackErrorMessage(elementId);
                }
            }
            
            let text;
            let contentHash;
            
            // Use cached content if available and fresh
            // 利用可能で新鮮な場合はキャッシュされたコンテンツを使用
            if (cached) {
                // Verify content hasn't changed by checking a quick HEAD request
                // HEADリクエストでコンテンツが変更されていないことを確認
                try {
                    const bustUrl = addCacheBuster(filePath);
                    const headResponse = await fetch(bustUrl, { method: 'HEAD' });
                    const lastModified = headResponse.headers.get('last-modified');
                    const etag = headResponse.headers.get('etag');
                    
                    // Simple cache validation - if we have etag or last-modified, compare
                    // 簡単なキャッシュ検証 - etagまたはlast-modifiedがある場合は比較
                    if (etag && cached.etag === etag) {
                        console.log(`Using cached content for: ${filePath}`);
                        text = cached.content;
                        contentHash = cached.hash;
                    } else if (lastModified && cached.lastModified === lastModified) {
                        console.log(`Using cached content for: ${filePath}`);
                        text = cached.content;
                        contentHash = cached.hash;
                    } else {
                        // Cache is stale, fetch new content
                        // キャッシュが古い、新しいコンテンツを取得
                        throw new Error('Cache is stale');
                    }
                } catch (cacheCheckError) {
                    // Fall through to fetch new content
                    // 新しいコンテンツの取得に進む
                    console.log(`Cache validation failed for ${filePath}, fetching fresh content`);
                    cached.isStale = true;
                }
            }
            
            // Fetch new content if not cached or cache is stale
            // キャッシュされていないかキャッシュが古い場合は新しいコンテンツを取得
            if (!cached || cached.isStale) {
                const bustUrl = addCacheBuster(filePath);
                const response = await fetch(bustUrl);
                
                if (!response.ok) {
                    console.log(`Failed to fetch: ${filePath}, loading 404 page`);
                    
                    if (!is404Page) {
                        return await loadMarkdown('public/404.md', elementId, '404');
                    } else {
                        return showFallbackErrorMessage(elementId);
                    }
                }
                
                text = await response.text();
                contentHash = simpleHash(text);
                
                // Cache the new content / 新しいコンテンツをキャッシュ
                const cacheData = {
                    content: text,
                    timestamp: Date.now(),
                    hash: contentHash,
                    etag: response.headers.get('etag'),
                    lastModified: response.headers.get('last-modified')
                };
                
                if (CONFIG.enableMemoryCache) {
                    cleanOldCache();
                    contentCache.set(filePath, cacheData);
                    fileHashCache.set(filePath, contentHash);
                }
                
                console.log(`Fetched and cached new content for: ${filePath}`);
            }
            
            // Convert Markdown to HTML / MarkdownをHTMLに変換
            const converter = new showdown.Converter();
            const html = converter.makeHtml(text);
            
            const targetElement = document.getElementById(elementId);
            if (!targetElement) {
                console.error(`Element with ID '${elementId}' not found`);
                return showFallbackErrorMessage('home');
            }
            
            // Sanitize and inject HTML / HTMLをサニタイズして注入
            targetElement.innerHTML = DOMPurify.sanitize(html);
            
            // Store file path to hash mapping / ファイルパスからハッシュへのマッピングを保存
            pathToHashMap[filePath] = originalHash;
            
            // Update URL hash if needed / 必要に応じてURLハッシュを更新
            if (originalHash && window.location.hash.substring(1) !== originalHash) {
                history.replaceState(null, '', `#${originalHash}`);
            }
            
            // Update page display and title / ページ表示とタイトルを更新
            showPage(elementId);
            updatePageTitle(originalHash);
            
            return true;
        } catch (error) {
            console.error('Error loading Markdown:', error);
            
            // Handle errors by loading 404 page / エラーは404ページの読み込みで処理
            if (filePath !== 'public/404.md') {
                return await loadMarkdown('public/404.md', elementId, '404');
            } else {
                return showFallbackErrorMessage(elementId);
            }
        }
    }

    /**
     * Parse file path from URL hash
     * URLハッシュからファイルパスを解析
     * @param {string} hash - URL hash / URLハッシュ
     * @returns {Object} - Parsed path information / 解析されたパス情報
     */
    function parsePathFromHash(hash) {
        if (!hash) return { filePath: 'public/home.md', elementId: 'home', originalHash: 'home' };
        
        // Handle 404 pattern directly / 404パターンを直接処理
        if (hash === '404') return { filePath: 'public/404.md', elementId: '404', originalHash: '404' };
        
        const segments = hash.split('/');
        let filePath = 'public/';
        let elementId = segments[0];
        
        if (segments.length === 1) {
            // Single segment (e.g., #home) / 単一セグメント（例：#home）
            filePath += `${hash}.md`;
        } else {
            // Multiple segments (e.g., #blog/0001 or #work/PoE/001) / 複数セグメント（例：#blog/0001や#work/PoE/001）
            let currentPath = '';
            
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                
                if (i === segments.length - 1) {
                    // Last segment is filename / 最後のセグメントはファイル名
                    currentPath += `${segment}.md`;
                } else {
                    // Intermediate segments are directory names / 中間セグメントはディレクトリ名
                    // First segment is kept as elementId / 最初のセグメントはelementIdとして保持
                    if (i === 0) {
                        elementId = segment;
                    }
                    
                    // Add 's' to directory names / ディレクトリ名に's'を追加
                    currentPath += `${segment}s/`;
                }
            }
            
            filePath += currentPath;
        }
        
        return { filePath, elementId, originalHash: hash };
    }

    /**
     * Update page title based on hash
     * ハッシュに基づいてページタイトルを更新
     * @param {string} hash - URL hash / URLハッシュ
     */
    function updatePageTitle(hash) {
        let pageTitle = 'My Website';
        
        if (hash) {
            if (hash === '404') {
                pageTitle += ' | Page Not Found';
            } else {
                const segments = hash.split('/');
                if (segments.length === 1) {
                    // Single segment / 単一セグメント
                    pageTitle += ` | ${segments[0].charAt(0).toUpperCase() + segments[0].slice(1)}`;
                } else {
                    // Multiple segments / 複数セグメント
                    const mainSection = segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
                    const subSection = segments[segments.length - 1];
                    pageTitle += ` | ${mainSection} - ${subSection}`;
                }
            }
        }
        
        document.title = pageTitle;
    }

    /**
     * Handle anchor links within pages
     * ページ内のアンカーリンクを処理
     */
    function handleAnchorLinks() {
        const url = window.location.href;
        const hasAnchor = url.includes('#') && url.split('#').length > 1;

        if (hasAnchor) {
            const parts = url.split('#');
            // Separate page identifier and anchor identifier
            // ページ識別子とアンカー識別子を分離
            const pageIdentifier = parts[1].split(':')[0];
            const anchorIdentifier = parts.length > 2 ? parts[2] : 
                                    (parts[1].includes(':') ? parts[1].split(':')[1] : null);
        
            // Scroll to anchor if identifier exists / 識別子が存在すればアンカーにスクロール
            if (anchorIdentifier) {
                setTimeout(() => {
                    const element = document.getElementById(anchorIdentifier);
                    if (element) {
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }, 300);
            }
        }
    }

    // Execute anchor link processing on page load and hash change
    // ページロード時とハッシュ変更時にアンカーリンク処理を実行
    window.addEventListener('load', handleAnchorLinks);
    window.addEventListener('hashchange', handleAnchorLinks);

    /**
     * Navigate to specific hash
     * 特定のハッシュにナビゲート
     */
    async function navigateToHash() {
        const hash = window.location.hash.substring(1);
        
        if (!hash) {
            await loadMarkdown('public/home.md', 'home', 'home');
            return;
        }
        
        const { filePath, elementId, originalHash } = parsePathFromHash(hash);
        
        // Load file - 404 handling is done within loadMarkdown
        // ファイルを読み込み - 404処理はloadMarkdown内で実行
        await loadMarkdown(filePath, elementId, originalHash);
        
        // Execute anchor link processing with slight delay
        // 少し遅延してアンカーリンク処理を実行
        setTimeout(handleAnchorLinks, 100);
    }

    /**
     * Custom navigation function for programmatic link changes
     * プログラムからリンクを変更する場合のカスタムナビゲーション関数
     * @param {string} hash - Target hash / ターゲットハッシュ
     */
    window.navigateTo = function(hash) {
        if (hash.startsWith('#')) {
            hash = hash.substring(1);
        }
        
        window.location.hash = `#${hash}`;
    };

    /**
     * Clear all caches (useful for development/debugging)
     * すべてのキャッシュをクリア（開発/デバッグに有用）
     */
    window.clearCache = function() {
        contentCache.clear();
        fileHashCache.clear();
        console.log('All caches cleared');
    };

    /**
     * Get cache statistics
     * キャッシュ統計を取得
     * @returns {Object} - Cache statistics / キャッシュ統計
     */
    window.getCacheStats = function() {
        return {
            contentCacheSize: contentCache.size,
            fileHashCacheSize: fileHashCache.size,
            cacheTimeout: CONFIG.cacheTimeout,
            enableMemoryCache: CONFIG.enableMemoryCache,
            enableCacheBusting: CONFIG.enableCacheBusting
        };
    };

    // Listen for hash changes / ハッシュ変更をリスン
    window.addEventListener('hashchange', navigateToHash);

    // Initial navigation based on hash / ハッシュに基づく初期ナビゲーション
    navigateToHash();

    // Redirect to home if no URL hash / URLハッシュがない場合はホームにリダイレクト
    if (!window.location.hash) {
        window.location.hash = '#home';
    }
});