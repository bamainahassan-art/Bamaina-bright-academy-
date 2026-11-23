import { useState } from 'react';
import { Calendar, MapPin, X } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import type { GalleryItem, NewsItem, PublicBootstrap } from '../lib/types';

interface NewsGalleryPageProps {
  mode: 'news' | 'gallery';
  data: PublicBootstrap;
  onSwitchMode: (mode: 'news' | 'gallery') => void;
}

export function NewsGalleryPage({ mode, data, onSwitchMode }: NewsGalleryPageProps) {
  const [newsCategory, setNewsCategory] = useState<string>('All');
  const [galleryCategory, setGalleryCategory] = useState<string>('All');
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  const [activePhoto, setActivePhoto] = useState<GalleryItem | null>(null);

  const newsCategories = ['All', 'Announcement', 'Admission', 'Examination', 'Achievement', 'Event'];
  const galleryCategories = [
    'All',
    'Nursery Classroom',
    'Primary Classroom',
    'Teachers & Students',
    'School Facilities',
    'Sports & Extracurricular',
  ];

  const filteredNews = data.news.filter((n) =>
    newsCategory === 'All' ? true : n.category === newsCategory
  );
  const filteredGallery = data.gallery.filter((g) =>
    galleryCategory === 'All' ? true : g.category === galleryCategory
  );

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-blue-950 text-white py-12 border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-amber-300 mb-2">
              School Life & Updates
            </p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-white">
              {mode === 'news' ? 'News, Notices & Events' : 'School Photo Gallery'}
            </h1>
          </div>
          <div className="inline-flex items-center gap-1 p-1 bg-blue-900 rounded-lg self-start">
            <button
              type="button"
              onClick={() => onSwitchMode('news')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'news' ? 'bg-amber-400 text-slate-950' : 'text-blue-100 hover:text-white'
              }`}
            >
              News & Events
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode('gallery')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'gallery' ? 'bg-amber-400 text-slate-950' : 'text-blue-100 hover:text-white'
              }`}
            >
              Photo Gallery
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {mode === 'news' ? (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
              {newsCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNewsCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    newsCategory === cat
                      ? 'bg-white text-blue-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredNews.length === 0 ? (
              <div className="border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                No published announcements in this category yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNews.map((item) => (
                  <article
                    key={item.id}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col justify-between"
                  >
                    <div>
                      {item.imageUrl && (
                        <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                          <SafeImage
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <span className="font-semibold text-blue-800">{item.category}</span>
                          {item.eventDate && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {item.eventDate}
                              </span>
                            </>
                          )}
                        </div>
                        <h2 className="font-display font-bold text-lg text-blue-950 mb-2">
                          {item.title}
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed">{item.summary}</p>
                      </div>
                    </div>
                    <div className="px-6 pb-5 pt-2 flex items-center justify-between border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveArticle(item)}
                        className="text-xs font-semibold text-blue-800 hover:text-blue-950"
                      >
                        Read full notice
                      </button>
                      {item.location && (
                        <span className="text-xs text-slate-400 inline-flex items-center gap-1 truncate max-w-[160px]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
              {galleryCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setGalleryCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    galleryCategory === cat
                      ? 'bg-white text-blue-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGallery.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setActivePhoto(photo)}
                  className="text-left border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-blue-300 transition-colors group"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <SafeImage
                      src={photo.imageUrl}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-medium text-blue-800">{photo.category}</p>
                    <h3 className="font-display font-bold text-base text-blue-950 mt-0.5">
                      {photo.title}
                    </h3>
                    {photo.caption && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{photo.caption}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Article Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <span className="text-xs font-semibold text-blue-800">{activeArticle.category}</span>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {activeArticle.imageUrl && (
                <div className="aspect-[16/9] rounded-lg overflow-hidden">
                  <SafeImage
                    src={activeArticle.imageUrl}
                    alt={activeArticle.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="font-display font-bold text-2xl text-blue-950">
                {activeArticle.title}
              </h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {activeArticle.content}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full overflow-hidden border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <div>
                <p className="text-xs text-blue-800 font-semibold">{activePhoto.category}</p>
                <h3 className="font-display font-bold text-base text-blue-950">
                  {activePhoto.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-950 max-h-[70vh] flex items-center justify-center">
              <SafeImage
                src={activePhoto.imageUrl}
                alt={activePhoto.title}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            {activePhoto.caption && (
              <p className="px-5 py-3 text-sm text-slate-600">{activePhoto.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
