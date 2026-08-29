/**
 * node-group-AI Landing Page
 * Minimal JS for interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            navbar.style.background = 'rgba(10, 10, 15, 0.95)';
        } else {
            navbar.style.background = 'rgba(10, 10, 15, 0.8)';
        }

        lastScroll = currentScroll;
    });

    // Animate elements on scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    // Storage slider handling
    const storageSlider = document.getElementById('storage');
    const storageValue = document.getElementById('storage-value');
    if (storageSlider && storageValue) {
        storageSlider.addEventListener('input', () => {
            storageValue.textContent = storageSlider.value;
        });
    }

    // Form handling - submits to Cloudflare Worker
    const form = document.getElementById('waitlist-form');
    const formResult = document.getElementById('form-result');
    const API_ENDPOINT = 'https://node-group-ai-form-handler.hawaiideveloper.workers.dev';

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const button = form.querySelector('button[type="submit"]');
            const originalText = button.textContent;
            button.textContent = 'Submitting...';
            button.disabled = true;

            const submission = {
                email: document.getElementById('email').value,
                hardware: document.getElementById('hardware').value,
                storage_commitment_gb: parseInt(document.getElementById('storage').value, 10)
            };

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submission)
                });

                const data = await response.json();

                // Hide form, show result
                form.classList.add('hidden');
                formResult.classList.remove('hidden');

                if (data.success) {
                    // Show success message
                    const successDiv = formResult.querySelector('.result-success');
                    successDiv.classList.remove('hidden');
                    successDiv.querySelector('.result-message').textContent = data.message;

                    // Show valuation based on visibility
                    if (data.valuation && data.valuation.visible) {
                        const valuationDiv = formResult.querySelector('.valuation-reveal');
                        valuationDiv.classList.remove('hidden');
                        const amountEl = valuationDiv.querySelector('.valuation-amount');
                        animateValuation(amountEl, data.valuation.formatted);
                    } else {
                        const hiddenDiv = formResult.querySelector('.valuation-hidden');
                        hiddenDiv.classList.remove('hidden');
                    }
                } else {
                    // Show error
                    const errorDiv = formResult.querySelector('.result-error');
                    errorDiv.classList.remove('hidden');
                    errorDiv.querySelector('.error-message').textContent =
                        data.message || 'Please try again later.';
                }
            } catch (error) {
                console.error('Submission error:', error);
                form.classList.add('hidden');
                formResult.classList.remove('hidden');
                const errorDiv = formResult.querySelector('.result-error');
                errorDiv.classList.remove('hidden');
                errorDiv.querySelector('.error-message').textContent =
                    'Network error. Please try again.';
            }

            button.textContent = originalText;
            button.disabled = false;
        });
    }

    // Animate valuation reveal
    function animateValuation(element, finalValue) {
        element.style.opacity = '0';
        element.textContent = finalValue;

        // Fade in with scale
        setTimeout(() => {
            element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            element.style.opacity = '1';
            element.style.transform = 'scale(1.1)';
        }, 100);

        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 600);
    }

    // Network animation enhancement
    const nodes = document.querySelectorAll('.node');
    nodes.forEach((node, index) => {
        node.style.animationDelay = `${index * 0.2}s`;
    });

    // Connection line animation
    const connections = document.querySelectorAll('.connection');
    connections.forEach((line, index) => {
        line.style.animationDelay = `${index * 0.3}s`;
    });

    // Add hover effects to tech cards
    const techCards = document.querySelectorAll('.tech-card');
    techCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
            card.style.borderColor = 'var(--accent-primary)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.borderColor = 'var(--border-color)';
        });
    });

    // Tier cards hover
    const tierCards = document.querySelectorAll('.tier');
    tierCards.forEach(card => {
        if (!card.classList.contains('featured')) {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        }
    });

    // Console easter egg
    console.log(`
    ╔═══════════════════════════════════════════════════════╗
    ║                                                        ║
    ║   node-group-AI                                        ║
    ║   The swarm IS the model.                              ║
    ║                                                        ║
    ║   Interested in contributing?                          ║
    ║   https://github.com/AlbrightLaboratories/node-group-AI║
    ║                                                        ║
    ╚═══════════════════════════════════════════════════════╝
    `);
});

// Add CSS animation class
const style = document.createElement('style');
style.textContent = `
    section {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }

    section.animate-in {
        opacity: 1;
        transform: translateY(0);
    }

    .tech-card, .tier {
        transition: transform 0.2s ease, border-color 0.2s ease;
    }
`;
document.head.appendChild(style);
