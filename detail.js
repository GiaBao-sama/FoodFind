let currentPlaceId = null;
let currentReviewId = null;

function getReviews(placeId) {
    try {
        const allReviews = JSON.parse(localStorage.getItem('foodfinderReviews') || '{}');
        return allReviews[placeId] || [];
    } catch (error) {
        return [];
    }
}

function saveReviews(placeId, reviews) {
    const allReviews = JSON.parse(localStorage.getItem('foodfinderReviews') || '{}');
    allReviews[placeId] = reviews;
    localStorage.setItem('foodfinderReviews', JSON.stringify(allReviews));
}

function renderReviews(placeId) {
    const container = document.getElementById('review-list');
    const reviews = getReviews(placeId);

    if (!reviews.length) {
        container.innerHTML = '<div class="empty-review">Chưa có đánh giá nào cho quán này.</div>';
        return;
    }

    container.innerHTML = reviews.map(review => `
        <article class="review-item">
            <div class="review-top">
                <div>
                    <strong>${review.userName || 'Người dùng'}</strong>
                    <div class="review-meta">${'★'.repeat(review.rating || 0)}${'☆'.repeat(5 - (review.rating || 0))}</div>
                </div>
                <div class="review-actions">
                    <button class="btn btn-sm btn-outline-secondary edit-review-btn" data-id="${review.id}">Sửa</button>
                    <button class="btn btn-sm btn-outline-danger delete-review-btn" data-id="${review.id}">Xóa</button>
                </div>
            </div>
            <p class="review-text">${review.text || ''}</p>
            ${review.image ? `<img src="${review.image}" alt="Ảnh đánh giá" class="review-media">` : ''}
            ${review.video ? `<a href="${review.video}" target="_blank" class="review-media-link">Xem video</a>` : ''}
            <div class="review-meta">${new Date(review.createdAt).toLocaleString('vi-VN')}</div>
        </article>
    `).join('');

    document.querySelectorAll('.edit-review-btn').forEach(button => {
        button.addEventListener('click', () => {
            const review = reviews.find(item => item.id === button.dataset.id);
            if (!review) return;
            currentReviewId = review.id;
            document.getElementById('review-text').value = review.text || '';
            document.getElementById('review-rating').value = review.rating || 5;
            updateStarDisplay(Number(document.getElementById('review-rating').value || 5));
            document.getElementById('review-image').value = review.image || '';
            document.getElementById('review-video').value = review.video || '';
            document.getElementById('cancel-edit-review').classList.remove('d-none');
            document.getElementById('submit-review').textContent = 'Cập nhật đánh giá';
        });
    });

    document.querySelectorAll('.delete-review-btn').forEach(button => {
        button.addEventListener('click', () => {
            const updated = reviews.filter(item => item.id !== button.dataset.id);
            saveReviews(placeId, updated);
            renderReviews(placeId);
        });
    });
}

function updateStarDisplay(value) {
    const buttons = document.querySelectorAll('.star-btn');
    buttons.forEach(button => {
        const btnValue = Number(button.dataset.value || 0);
        button.classList.toggle('active', btnValue <= value);
    });
}

function resetReviewForm() {
    document.getElementById('review-text').value = '';
    document.getElementById('review-rating').value = 5;
    updateStarDisplay(5);
    document.getElementById('review-image').value = '';
    document.getElementById('review-video').value = '';
    document.getElementById('cancel-edit-review').classList.add('d-none');
    document.getElementById('submit-review').textContent = 'Đăng đánh giá';
    currentReviewId = null;
}

async function loadDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    currentPlaceId = id;

    if (!id) {
        document.getElementById('detail-name').textContent = 'Không tìm thấy quán';
        return;
    }

    try {
        const response = await fetch('data/res.json');
        const data = await response.json();
        const place = Array.isArray(data) ? data.find(item => String(item.id) === String(id)) : null;

        if (!place) {
            document.getElementById('detail-name').textContent = 'Không tìm thấy quán';
            return;
        }

        document.title = `FoodFinder | ${place.name || 'Chi tiết quán'}`;
        document.getElementById('detail-name').textContent = place.name || 'Không tên';
        document.getElementById('detail-intro').textContent = place.tags?.join(' • ') || 'Quán phù hợp cho nhiều nhu cầu.';
        const detailImage = document.getElementById('detail-image');
        detailImage.src = place.image || '';
        detailImage.alt = place.name || 'quán';
        detailImage.onerror = () => { detailImage.style.display = 'none'; };

        const galleryImages = Array.isArray(place.galleryImages) && place.galleryImages.length
            ? place.galleryImages
            : [place.image].filter(Boolean);
        const carouselInner = document.getElementById('carousel-inner');
        const indicators = document.getElementById('carousel-indicators');
        carouselInner.innerHTML = '';
        indicators.innerHTML = '';

        galleryImages.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = `carousel-item${index === 0 ? ' active' : ''}`;
            item.innerHTML = `<img src="${img}" class="d-block w-100" alt="${place.name || 'quán'} ${index + 1}">`;
            carouselInner.appendChild(item);

            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('data-bs-target', '#image-carousel');
            button.setAttribute('data-bs-slide-to', String(index));
            button.className = index === 0 ? 'active' : '';
            button.setAttribute('aria-current', index === 0 ? 'true' : 'false');
            button.setAttribute('aria-label', `Slide ${index + 1}`);
            indicators.appendChild(button);
        });

        document.getElementById('detail-address').textContent = place.address || 'Đang cập nhật';
        document.getElementById('detail-district').textContent = place.district || 'Đang cập nhật';
        document.getElementById('detail-time').textContent = `${place.openTime?.open || '--'} - ${place.openTime?.close || '--'}`;
        document.getElementById('detail-price').textContent = place.price && (place.price.min != null || place.price.max != null)
            ? `${Number(place.price.min).toLocaleString()}đ - ${Number(place.price.max).toLocaleString()}đ`
            : 'Giá liên hệ';
        document.getElementById('detail-rating').textContent = place.rating != null ? `${place.rating} ★` : 'Chưa có';
        document.getElementById('detail-category').textContent = place.category || 'Khác';
        document.getElementById('detail-short-address').textContent = place.address || 'Đang cập nhật';

        const tags = document.getElementById('detail-tags');
        tags.innerHTML = '';
        (place.tags || []).forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'feature-chip';
            chip.textContent = tag;
            tags.appendChild(chip);
        });

        const features = document.getElementById('detail-features');
        features.innerHTML = '';
        const featureMap = place.features || {};
        Object.entries(featureMap).forEach(([key, value]) => {
            if (value) {
                const chip = document.createElement('span');
                chip.className = 'feature-chip';
                chip.textContent = key;
                features.appendChild(chip);
            }
        });

        const meta = document.getElementById('detail-meta');
        meta.innerHTML = `
            <div class="detail-meta-item"><strong>📍 ${place.district || 'Đang cập nhật'}</strong></div>
            <div class="detail-meta-item"><strong>🕒 ${place.openTime?.open || '--'} - ${place.openTime?.close || '--'}</strong></div>
            <div class="detail-meta-item"><strong>💸 ${place.price && (place.price.min != null || place.price.max != null) ? `${Number(place.price.min).toLocaleString()}đ - ${Number(place.price.max).toLocaleString()}đ` : 'Giá liên hệ'}</strong></div>
        `;

        renderReviews(id);
    } catch (error) {
        console.error(error);
        document.getElementById('detail-name').textContent = 'Không thể tải thông tin';
    }
}

document.querySelectorAll('.star-btn').forEach(button => {
    button.addEventListener('click', () => {
        const value = Number(button.dataset.value || 5);
        document.getElementById('review-rating').value = value;
        updateStarDisplay(value);
    });
});

document.getElementById('submit-review')?.addEventListener('click', () => {
    const text = document.getElementById('review-text').value.trim();
    const rating = Number(document.getElementById('review-rating').value || 5);
    const image = document.getElementById('review-image').value.trim();
    const video = document.getElementById('review-video').value.trim();

    if (!text) {
        alert('Vui lòng nhập nội dung đánh giá');
        return;
    }

    const reviews = getReviews(currentPlaceId);
    if (currentReviewId) {
        const updated = reviews.map(item => item.id === currentReviewId ? {
            ...item,
            text,
            rating,
            image,
            video,
            updatedAt: new Date().toISOString()
        } : item);
        saveReviews(currentPlaceId, updated);
    } else {
        reviews.unshift({
            id: Date.now().toString(),
            userName: 'Bạn',
            text,
            rating,
            image,
            video,
            createdAt: new Date().toISOString()
        });
        saveReviews(currentPlaceId, reviews);
    }

    resetReviewForm();
    renderReviews(currentPlaceId);
});

document.getElementById('cancel-edit-review')?.addEventListener('click', resetReviewForm);

loadDetail();
