// إعدادات Supabase
const SUPABASE_URL = 'https://thhkdkeswuuduhvbwkuys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoaGtka2Vzd3V1ZHVodmJ3a3V5cyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM2MTY4NjQ2LCJleHAiOjIwNTE3NDQ2NDZ9.8qJlLOGNKJLBYLJKGZLJKGZLJKGZLJKGZLJKGZLJKGZ';

// تهيئة Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// متغيرات عامة
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let isAdmin = false;

// عناصر DOM
const productsGrid = document.getElementById('products-grid');
const cartSidebar = document.getElementById('cart-sidebar');
const cartItems = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');
const adminModal = document.getElementById('admin-modal');
const overlay = document.getElementById('overlay');
const searchInput = document.getElementById('search-input');

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadProducts();
    updateCartUI();
});

// تهيئة التطبيق
function initializeApp() {
    // إضافة تأثيرات التمرير
    const scrollElements = document.querySelectorAll('.scroll-reveal');
    const elementInView = (el, dividend = 1) => {
        const elementTop = el.getBoundingClientRect().top;
        return (
            elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend
        );
    };

    const displayScrollElement = (element) => {
        element.classList.add('revealed');
    };

    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 1.25)) {
                displayScrollElement(el);
            }
        });
    };

    window.addEventListener('scroll', handleScrollAnimation);
    handleScrollAnimation(); // تشغيل فوري للعناصر المرئية
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // البحث
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // أزرار الفلترة
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });
    
    // سلة التسوق
    document.getElementById('cart-icon').addEventListener('click', toggleCart);
    document.getElementById('close-cart').addEventListener('click', closeCart);
    document.getElementById('checkout-btn').addEventListener('click', handleCheckout);
    
    // الإدارة
    document.getElementById('admin-icon').addEventListener('click', openAdminModal);
    document.getElementById('close-modal').addEventListener('click', closeAdminModal);
    document.getElementById('login-btn').addEventListener('click', handleAdminLogin);
    document.getElementById('product-form').addEventListener('submit', handleAddProduct);
    
    // الخلفية المظلمة
    overlay.addEventListener('click', closeAll);
    
    // إغلاق بمفتاح Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAll();
        }
    });
}

// تحميل المنتجات من Supabase
async function loadProducts() {
    try {
        showLoading();
        
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        products = data || [];
        displayProducts(products);
        
    } catch (error) {
        console.error('خطأ في تحميل المنتجات:', error);
        showError('حدث خطأ في تحميل المنتجات. يرجى المحاولة مرة أخرى.');
    }
}

// عرض المنتجات
function displayProducts(productsToShow) {
    if (!productsGrid) return;
    
    if (productsToShow.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-products">
                <i class="fas fa-box-open"></i>
                <h3>لا توجد منتجات متاحة</h3>
                <p>سيتم إضافة منتجات جديدة قريباً</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = productsToShow.map(product => `
        <div class="product-card fade-in" data-id="${product.id}">
            <div class="product-image">
                <img src="${product.image || 'https://via.placeholder.com/300x250?text=صورة+المنتج'}" 
                     alt="${product.name}" 
                     onerror="this.src='https://via.placeholder.com/300x250?text=صورة+المنتج'">
                <div class="product-badge">جديد</div>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description || 'وصف المنتج غير متوفر'}</p>
                <div class="product-price">${formatPrice(product.price)} د.ب</div>
                <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                    <i class="fas fa-shopping-cart"></i>
                    إضافة للسلة
                </button>
            </div>
        </div>
    `).join('');
}

// إضافة منتج للسلة
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartUI();
    showNotification('تم إضافة المنتج للسلة بنجاح!', 'success');
    
    // تأثير بصري
    const button = event.target.closest('.add-to-cart-btn');
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
}

// إزالة منتج من السلة
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    showNotification('تم إزالة المنتج من السلة', 'info');
}

// تحديث واجهة السلة
function updateCartUI() {
    // تحديث عداد السلة
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    // تحديث محتوى السلة
    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h4>السلة فارغة</h4>
                    <p>لم تقم بإضافة أي منتجات بعد</p>
                </div>
            `;
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${item.image || 'https://via.placeholder.com/60x60?text=منتج'}" 
                             alt="${item.name}"
                             onerror="this.src='https://via.placeholder.com/60x60?text=منتج'">
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-price">${formatPrice(item.price)} د.ب × ${item.quantity}</div>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    // تحديث المجموع
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotal) {
        cartTotal.textContent = `المجموع: ${formatPrice(total)} د.ب`;
    }
    
    // تحديث زر الدفع
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
    }
}

// حفظ السلة في التخزين المحلي
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// تبديل عرض السلة
function toggleCart() {
    cartSidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// إغلاق السلة
function closeCart() {
    cartSidebar.classList.remove('active');
    overlay.classList.remove('active');
}

// معالجة الدفع
function handleCheckout() {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemsText = cart.map(item => `${item.name} (${item.quantity})`).join(', ');
    
    showNotification(`تم تأكيد طلبك بقيمة ${formatPrice(total)} د.ب`, 'success');
    
    // مسح السلة
    cart = [];
    saveCart();
    updateCartUI();
    closeCart();
    
    // يمكن إضافة منطق الدفع الفعلي هنا
    console.log('تفاصيل الطلب:', { items: cart, total, itemsText });
}

// البحث في المنتجات
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        displayProducts(products);
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
    );
    
    displayProducts(filteredProducts);
}

// فلترة المنتجات
function handleFilter(event) {
    const filterValue = event.target.dataset.filter;
    
    // تحديث الأزرار النشطة
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (filterValue === 'all') {
        displayProducts(products);
    } else {
        // يمكن إضافة منطق الفلترة حسب الفئة هنا
        displayProducts(products);
    }
}

// فتح نافذة الإدارة
function openAdminModal() {
    adminModal.classList.add('active');
    overlay.classList.add('active');
}

// إغلاق نافذة الإدارة
function closeAdminModal() {
    adminModal.classList.remove('active');
    overlay.classList.remove('active');
    
    // إعادة تعيين النموذج
    document.getElementById('admin-password').value = '';
    document.getElementById('product-form').reset();
    
    // إخفاء نموذج المنتج إذا لم يكن المستخدم مديراً
    if (!isAdmin) {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('product-section').style.display = 'none';
    }
}

// تسجيل دخول المدير
function handleAdminLogin() {
    const password = document.getElementById('admin-password').value;
    
    if (password === '12345') { // كلمة مرور بسيطة للتجربة
        isAdmin = true;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('product-section').style.display = 'block';
        showNotification('تم تسجيل الدخول بنجاح!', 'success');
    } else {
        showNotification('كلمة المرور غير صحيحة', 'error');
    }
}

// إضافة منتج جديد
async function handleAddProduct(event) {
    event.preventDefault();
    
    if (!isAdmin) {
        showNotification('يجب تسجيل الدخول كمدير أولاً', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price'))
    };
    
    // التحقق من صحة البيانات
    if (!productData.name || !productData.price || productData.price <= 0) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    try {
        showLoading();
        
        let imageUrl = null;
        const imageFile = formData.get('image');
        
        // رفع الصورة إذا تم اختيارها
        if (imageFile && imageFile.size > 0) {
            const fileName = `${Date.now()}_${imageFile.name}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, imageFile);
            
            if (uploadError) {
                throw new Error(`خطأ في رفع الصورة: ${uploadError.message}`);
            }
            
            // الحصول على رابط الصورة العام
            const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);
            
            imageUrl = urlData.publicUrl;
        }
        
        // إضافة المنتج لقاعدة البيانات
        const { data, error } = await supabase
            .from('products')
            .insert([{
                name: productData.name,
                description: productData.description,
                price: productData.price,
                image: imageUrl
            }])
            .select();
        
        if (error) {
            throw error;
        }
        
        // تحديث قائمة المنتجات
        await loadProducts();
        
        // إعادة تعيين النموذج
        event.target.reset();
        
        showNotification('تم إضافة المنتج بنجاح!', 'success');
        
    } catch (error) {
        console.error('خطأ في إضافة المنتج:', error);
        showNotification(error.message || 'حدث خطأ في إضافة المنتج', 'error');
    }
}

// إغلاق جميع النوافذ المنبثقة
function closeAll() {
    closeCart();
    closeAdminModal();
}

// عرض مؤشر التحميل
function showLoading() {
    if (productsGrid) {
        productsGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري التحميل...</p>
            </div>
        `;
    }
}

// عرض رسالة خطأ
function showError(message) {
    if (productsGrid) {
        productsGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>حدث خطأ</h3>
                <p>${message}</p>
                <button onclick="loadProducts()" class="retry-btn">إعادة المحاولة</button>
            </div>
        `;
    }
}

// عرض الإشعارات
function showNotification(message, type = 'info') {
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // إضافة الأنماط
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 300px;
        font-weight: 500;
    `;
    
    // إضافة للصفحة
    document.body.appendChild(notification);
    
    // تأثير الظهور
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // إزالة الإشعار بعد 3 ثوان
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// الحصول على أيقونة الإشعار
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// الحصول على لون الإشعار
function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#28a745';
        case 'error': return '#dc3545';
        case 'warning': return '#ffc107';
        default: return '#17a2b8';
    }
}

// تنسيق السعر
function formatPrice(price) {
    return new Intl.NumberFormat('ar-BH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price);
}

// دالة التأخير للبحث
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// تأثيرات إضافية عند التحميل
window.addEventListener('load', function() {
    // إضافة تأثير التلاشي للعناصر
    document.body.classList.add('loaded');
    
    // تحديث عداد السلة عند التحميل
    updateCartUI();
});

// معالجة الأخطاء العامة
window.addEventListener('error', function(event) {
    console.error('خطأ في التطبيق:', event.error);
});

// تصدير الدوال للاستخدام العام
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.closeCart = closeCart;
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;

