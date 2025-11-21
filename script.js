// Database of movies with descriptions
const mediaData = [
    { 
        title: "Cyberpunk 2077", 
        year: 2023, 
        rating: "9.8", 
        type: "Sci-Fi",
        desc: "In a dystopian future, a mercenary outlaw pursues a one-of-a-kind implant that is the key to immortality.",
        img: "https://dnm.nflximg.net/api/v6/BvVbc2Wxr2w6QuoANoSpJKEIWjQ/AAAAQVu0Wfx2iq9JzVJtZgaRoABIHO-ZpHLlz2H5kEvBRXjR2lH23h4HR9DJUOS6QVxbldNY-nj89Yw-n5QgrEOUhK_JVBWZlexaNT_ycG3gFdie7X434fe9ZZQjz9wpYbSqRTQHIgLNh9Kw0zTKFni_.jpg?r=f84" 
    },
    { 
        title: "The Silent Sea", 
        year: 2022, 
        rating: "8.5", 
        type: "Drama",
        desc: "During a perilous 24-hour mission on the moon, space explorers try to retrieve samples from an abandoned research facility.",
        img: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=600&q=80" 
    },
    { 
        title: "Neon Driver", 
        year: 2021, 
        rating: "9.2", 
        type: "Action",
        desc: "A mysterious getaway driver navigates the neon-lit streets of Neo-Tokyo while being hunted by a powerful syndicate.",
        img: "https://images.unsplash.com/photo-1496449903678-68ddcb189a24?auto=format&fit=crop&w=600&q=80" 
    },
    { 
        title: "Lost in the Void", 
        year: 2024, 
        rating: "8.9", 
        type: "Mystery",
        desc: "A team of deep-sea miners discovers an ancient alien structure at the bottom of the Mariana Trench.",
        img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80" 
    },
    { 
        title: "Urban Samurai", 
        year: 2020, 
        rating: "9.5", 
        type: "Action",
        desc: "Modern day warriors fight for honor in a society governed by high-tech corporate warfare.",
        img: "https://cdn.prod.website-files.com/65e207b4ee69757242645bb2/65f2ce1353db1ea40a35c345_Samurai%20Model_3.webp" 
    },
    { 
        title: "Retro Wave", 
        year: 2023, 
        rating: "7.8", 
        type: "Music",
        desc: "A documentary exploring the resurgence of 80s synthesizer music in the 21st century.",
        img: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=600&q=80" 
    },
    { 
        title: "Protocol X", 
        year: 2022, 
        rating: "8.1", 
        type: "Thriller",
        desc: "A hacker uncovers a government conspiracy that threatens to shut down the global internet grid.",
        img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80" 
    },
    { 
        title: "Mars Horizon", 
        year: 2025, 
        rating: "9.0", 
        type: "Sci-Fi",
        desc: "The first human colony on Mars faces an unexpected threat from within their own ranks.",
        img: "https://image.api.playstation.com/vulcan/ap/rnd/202010/0117/CI6c4X9YcFeSbDwC2PmVEp7n.png" 
    }
];

const grid = document.getElementById('contentGrid');

// Function to render cards
function renderGallery() {
    grid.innerHTML = '';

    mediaData.forEach(item => {
        // Create Card Container
        const card = document.createElement('div');
        card.className = 'card';

        // Create HTML Structure
        card.innerHTML = `
            <img src="${item.img}" alt="${item.title}" class="card-img">
            <div class="card-details">
                <h3 class="card-title">${item.title}</h3>
                <div class="card-info">
                    <span>${item.year}</span>
                    <span><i class="fas fa-star" style="color:gold;"></i> ${item.rating}</span>
                    <span>${item.type}</span>
                </div>
                <p class="card-desc">${item.desc}</p>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Load on startup
window.onload = renderGallery;

// Optional: Simple click event
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active class from all
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        // Add to clicked
        this.classList.add('active');
        // In a real app, this would filter the 'mediaData' array and re-render
    });
});