import React, { useEffect, useState } from 'react';
import {
  SparklesIcon,
  DocumentTextIcon,
  PhotoIcon,
  EnvelopeIcon,
  ClockIcon,
  UserGroupIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  PresentationChartLineIcon,
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { aiAPI, optionsAPI } from '../services/api';
import toast from 'react-hot-toast';

const AI_TOOLS = [
  { id: 'content-writer', name: 'Content Writer', description: 'Generate marketing copy, blog posts, and ads', icon: DocumentTextIcon, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
  { id: 'subject-optimizer', name: 'Subject Line Optimizer', description: 'Optimize email subject lines for opens', icon: EnvelopeIcon, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50' },
  { id: 'social-manager', name: 'Social Media Manager', description: 'Create engaging social media posts', icon: MegaphoneIcon, color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50' },
  { id: 'ad-creator', name: 'Ad Creator', description: 'Generate ad copy for multiple platforms', icon: PresentationChartLineIcon, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50' },
  { id: 'review-response', name: 'Review Response', description: 'Generate professional review responses', icon: ChatBubbleLeftRightIcon, color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50' },
  { id: 'send-time', name: 'Send Time Optimizer', description: 'Find the best time to send campaigns', icon: ClockIcon, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50' },
  { id: 'audience-segmenter', name: 'Audience Segmenter', description: 'AI-powered contact segmentation', icon: UserGroupIcon, color: 'from-teal-500 to-teal-600', bgColor: 'bg-teal-50' },
  { id: 'campaign-suggester', name: 'Campaign Suggester', description: 'Get campaign ideas and recommendations', icon: LightBulbIcon, color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50' },
];

export default function AITools() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Options from API
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [tones, setTones] = useState<any[]>([]);
  const [socialPlatforms, setSocialPlatforms] = useState<any[]>([]);
  const [adPlatforms, setAdPlatforms] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);

  // Content Writer State
  const [contentType, setContentType] = useState('blog');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [keywords, setKeywords] = useState('');

  // Subject Line State
  const [subjectContent, setSubjectContent] = useState('');
  const [subjectCount, setSubjectCount] = useState(5);

  // Review Response State
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState('');

  // Social Media State
  const [socialPlatform, setSocialPlatform] = useState('facebook');
  const [socialTopic, setSocialTopic] = useState('');

  // Ad Creator State
  const [adPlatform, setAdPlatform] = useState('facebook');
  const [adProduct, setAdProduct] = useState('');
  const [adAudience, setAdAudience] = useState('');

  // Send Time Optimizer State
  const [sendTimeIndustry, setSendTimeIndustry] = useState('');
  const [sendTimeAudience, setSendTimeAudience] = useState('b2b');
  const [sendTimeCampaign, setSendTimeCampaign] = useState('promotional');

  // Audience Segmenter State
  const [segmentGoal, setSegmentGoal] = useState('');

  // Campaign Suggester State
  const [campaignIndustry, setCampaignIndustry] = useState('');
  const [campaignGoals, setCampaignGoals] = useState('');
  const [campaignSeason, setCampaignSeason] = useState('');
  const [campaignBusiness, setCampaignBusiness] = useState('');

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [contentTypesRes, tonesRes, socialRes, adRes, ratingsRes] = await Promise.all([
        optionsAPI.getAIContentTypes(),
        optionsAPI.getAITones(),
        optionsAPI.getSocialPlatforms(),
        optionsAPI.getAdPlatforms(),
        optionsAPI.getRatings(),
      ]);
      setContentTypes(contentTypesRes.data);
      setTones(tonesRes.data);
      setSocialPlatforms(socialRes.data);
      setAdPlatforms(adRes.data);
      setRatings(ratingsRes.data);
    } catch (error) {
      console.error('Failed to load options');
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      let response;
      switch (activeTool) {
        case 'content-writer':
          if (!topic.trim()) {
            toast.error('Please enter a topic');
            setLoading(false);
            return;
          }
          response = await aiAPI.generateContent({
            type: contentType,
            topic,
            tone,
            keywords: keywords.split(',').map((k) => k.trim()).filter((k) => k),
          });
          setResult({ type: 'text', content: response.data.content, title: 'Generated Content' });
          break;
        case 'subject-optimizer':
          if (!subjectContent.trim()) {
            toast.error('Please enter email content or topic');
            setLoading(false);
            return;
          }
          response = await aiAPI.optimizeSubject({ content: subjectContent, count: subjectCount });
          setResult({ type: 'list', items: response.data.subjects || response.data.subjectLines, title: 'Subject Line Suggestions' });
          break;
        case 'review-response':
          if (!reviewContent.trim()) {
            toast.error('Please enter the review content');
            setLoading(false);
            return;
          }
          response = await aiAPI.generateReviewResponse({
            reviewContent,
            rating: reviewRating,
            authorName: reviewAuthor || 'Customer',
          });
          setResult({ type: 'text', content: response.data.response, title: 'Generated Response' });
          break;
        case 'social-manager':
          if (!socialTopic.trim()) {
            toast.error('Please enter a topic for your post');
            setLoading(false);
            return;
          }
          response = await aiAPI.generateSocialPost({ platform: socialPlatform, topic: socialTopic });
          setResult({ type: 'social', content: response.data.post, platform: socialPlatform, title: 'Social Media Post' });
          break;
        case 'ad-creator':
          if (!adProduct.trim()) {
            toast.error('Please enter a product or service');
            setLoading(false);
            return;
          }
          response = await aiAPI.generateAd({
            platform: adPlatform,
            product: adProduct,
            targetAudience: adAudience,
          });
          setResult({
            type: 'ad',
            headline: response.data.headline,
            body: response.data.body,
            cta: response.data.cta,
            title: 'Ad Copy',
          });
          break;
        case 'send-time':
          response = await aiAPI.optimizeSendTime({
            industry: sendTimeIndustry,
            audienceType: sendTimeAudience,
            campaignType: sendTimeCampaign,
          });
          setResult({ type: 'sendtime', data: response.data, title: 'Optimal Send Times' });
          break;
        case 'audience-segmenter':
          response = await aiAPI.suggestSegments({ goal: segmentGoal });
          setResult({ type: 'segments', segments: response.data.suggestions, title: 'Suggested Segments' });
          break;
        case 'campaign-suggester':
          response = await aiAPI.suggestCampaign({
            industry: campaignIndustry,
            goals: campaignGoals,
            season: campaignSeason,
            businessDescription: campaignBusiness,
          });
          setResult({ type: 'campaign', data: response.data, title: 'Campaign Ideas' });
          break;
        default:
          toast.error('Tool not implemented');
      }
      toast.success('Generated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const getActiveTool = () => AI_TOOLS.find((t) => t.id === activeTool);

  const renderToolForm = () => {
    const inputClass = "block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all";
    const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

    switch (activeTool) {
      case 'content-writer':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Content Type</label>
              <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={inputClass}>
                {contentTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Topic/Subject <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Summer sale promotion, New product launch"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputClass}>
                {tones.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Keywords (comma-separated)</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., discount, limited time, exclusive"
                className={inputClass}
              />
            </div>
          </div>
        );
      case 'subject-optimizer':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Email Content/Topic <span className="text-red-500">*</span></label>
              <textarea
                value={subjectContent}
                onChange={(e) => setSubjectContent(e.target.value)}
                rows={4}
                placeholder="Describe your email content or paste the email body here..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Number of Suggestions</label>
              <select value={subjectCount} onChange={(e) => setSubjectCount(parseInt(e.target.value))} className={inputClass}>
                <option value={3}>3 suggestions</option>
                <option value={5}>5 suggestions</option>
                <option value={10}>10 suggestions</option>
              </select>
            </div>
          </div>
        );
      case 'review-response':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Customer Review <span className="text-red-500">*</span></label>
              <textarea
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                rows={4}
                placeholder="Paste the customer review here..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Rating</label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReviewRating(r)}
                    className={`p-2 rounded-lg transition-all ${reviewRating >= r ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    <StarIcon className={`h-8 w-8 ${reviewRating >= r ? 'fill-yellow-400' : ''}`} />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-500">{reviewRating} stars</span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Reviewer Name</label>
              <input
                type="text"
                value={reviewAuthor}
                onChange={(e) => setReviewAuthor(e.target.value)}
                placeholder="Customer name (optional)"
                className={inputClass}
              />
            </div>
          </div>
        );
      case 'social-manager':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Platform</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {socialPlatforms.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setSocialPlatform(p.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      socialPlatform === p.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Topic/Message <span className="text-red-500">*</span></label>
              <textarea
                value={socialTopic}
                onChange={(e) => setSocialTopic(e.target.value)}
                rows={4}
                placeholder="What do you want to post about?"
                className={inputClass}
              />
            </div>
          </div>
        );
      case 'ad-creator':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Platform</label>
              <select value={adPlatform} onChange={(e) => setAdPlatform(e.target.value)} className={inputClass}>
                {adPlatforms.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Product/Service <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={adProduct}
                onChange={(e) => setAdProduct(e.target.value)}
                placeholder="What are you advertising?"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Target Audience</label>
              <input
                type="text"
                value={adAudience}
                onChange={(e) => setAdAudience(e.target.value)}
                placeholder="e.g., Small business owners, 25-45 years old"
                className={inputClass}
              />
            </div>
          </div>
        );
      case 'send-time':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-100">
              <p className="text-sm text-orange-800">
                <strong>AI analyzes your data</strong> to find the best times to send emails based on your industry and audience.
              </p>
            </div>
            <div>
              <label className={labelClass}>Your Industry</label>
              <input
                type="text"
                value={sendTimeIndustry}
                onChange={(e) => setSendTimeIndustry(e.target.value)}
                placeholder="e.g., E-commerce, SaaS, Healthcare, Restaurant"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Audience Type</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { value: 'b2b', label: 'B2B', desc: 'Business customers' },
                  { value: 'b2c', label: 'B2C', desc: 'Consumers' },
                  { value: 'mixed', label: 'Mixed', desc: 'Both types' },
                  { value: 'local', label: 'Local', desc: 'Local community' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSendTimeAudience(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      sendTimeAudience === opt.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{opt.label}</span>
                    <span className="block text-xs text-gray-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Campaign Type</label>
              <select
                value={sendTimeCampaign}
                onChange={(e) => setSendTimeCampaign(e.target.value)}
                className={inputClass}
              >
                <option value="promotional">Promotional / Sales</option>
                <option value="newsletter">Newsletter</option>
                <option value="transactional">Transactional</option>
                <option value="announcement">Announcement</option>
                <option value="educational">Educational Content</option>
              </select>
            </div>
          </div>
        );
      case 'audience-segmenter':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
              <p className="text-sm text-teal-800">
                <strong>AI analyzes your contacts</strong> and suggests smart segments to improve your marketing campaigns.
              </p>
            </div>
            <div>
              <label className={labelClass}>What's your main goal? (Optional)</label>
              <textarea
                value={segmentGoal}
                onChange={(e) => setSegmentGoal(e.target.value)}
                rows={3}
                placeholder="e.g., Increase sales, improve retention, re-engage inactive customers, personalize content..."
                className={inputClass}
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">What the AI will analyze:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Contact engagement patterns</li>
                <li>• Tag distribution</li>
                <li>• Subscription status</li>
                <li>• Recent signups vs long-term subscribers</li>
              </ul>
            </div>
          </div>
        );
      case 'campaign-suggester':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <strong>AI creates campaign ideas</strong> tailored to your business and marketing goals.
              </p>
            </div>
            <div>
              <label className={labelClass}>Describe Your Business</label>
              <textarea
                value={campaignBusiness}
                onChange={(e) => setCampaignBusiness(e.target.value)}
                rows={2}
                placeholder="e.g., Online fitness coaching for busy professionals"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Industry</label>
                <input
                  type="text"
                  value={campaignIndustry}
                  onChange={(e) => setCampaignIndustry(e.target.value)}
                  placeholder="e.g., Fitness, Tech, Retail"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Season/Timing</label>
                <select
                  value={campaignSeason}
                  onChange={(e) => setCampaignSeason(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Any time</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                  <option value="fall">Fall</option>
                  <option value="winter">Winter</option>
                  <option value="holiday">Holiday Season</option>
                  <option value="back-to-school">Back to School</option>
                  <option value="new-year">New Year</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Your Goals</label>
              <textarea
                value={campaignGoals}
                onChange={(e) => setCampaignGoals(e.target.value)}
                rows={2}
                placeholder="e.g., Increase sales by 20%, grow email list, boost customer retention"
                className={inputClass}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderResult = () => {
    if (!result) return null;

    switch (result.type) {
      case 'text':
      case 'social':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
              <button
                onClick={() => copyToClipboard(result.content, 'main')}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                {copied === 'main' ? <CheckIcon className="h-4 w-4 mr-1" /> : <ClipboardDocumentIcon className="h-4 w-4 mr-1" />}
                {copied === 'main' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{result.content}</p>
            </div>
            {result.platform && (
              <p className="text-sm text-gray-500">
                Optimized for <span className="font-medium text-gray-700 capitalize">{result.platform}</span>
              </p>
            )}
          </div>
        );
      case 'list':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
            <div className="space-y-3">
              {(result.items || []).map((item: string, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center">
                    <span className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm mr-4">
                      {i + 1}
                    </span>
                    <span className="text-gray-800 font-medium">{item}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item, `item-${i}`)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                  >
                    {copied === `item-${i}` ? <CheckIcon className="h-5 w-5" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'ad':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Headline</span>
                  <button onClick={() => copyToClipboard(result.headline, 'headline')} className="text-purple-600 hover:text-purple-700">
                    {copied === 'headline' ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xl font-bold text-gray-900">{result.headline}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Body</span>
                  <button onClick={() => copyToClipboard(result.body, 'body')} className="text-purple-600 hover:text-purple-700">
                    {copied === 'body' ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-gray-700 leading-relaxed">{result.body}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide block mb-2">Call to Action</span>
                <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg">
                  {result.cta}
                  <ChevronRightIcon className="h-5 w-5 ml-2" />
                </button>
              </div>
            </div>
          </div>
        );
      case 'sendtime':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>

            {/* Primary Recommendations */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-200">
                <ClockIcon className="h-8 w-8 text-orange-500 mb-3" />
                <p className="text-sm font-medium text-orange-600 mb-1">Best Day</p>
                <p className="text-2xl font-bold text-gray-900">{result.data.bestDay || 'Tuesday'}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <ClockIcon className="h-8 w-8 text-blue-500 mb-3" />
                <p className="text-sm font-medium text-blue-600 mb-1">Best Time</p>
                <p className="text-2xl font-bold text-gray-900">{result.data.bestTime || '10:00 AM'}</p>
              </div>
            </div>

            {/* Alternative Options */}
            {(result.data.alternativeDay || result.data.alternativeTime) && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Alternative Options</p>
                <p className="text-sm text-gray-600">
                  Also consider: <span className="font-medium">{result.data.alternativeDay}</span> at <span className="font-medium">{result.data.alternativeTime}</span>
                </p>
              </div>
            )}

            {/* Reasoning */}
            {result.data.reasoning && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <p className="text-sm font-semibold text-green-700 mb-1">Why These Times?</p>
                <p className="text-sm text-green-800">{result.data.reasoning}</p>
              </div>
            )}

            {/* Industry Insights */}
            {result.data.industryInsights && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                <p className="text-sm font-semibold text-purple-700 mb-1">Industry Insight</p>
                <p className="text-sm text-purple-800">{result.data.industryInsights}</p>
              </div>
            )}

            {/* Recommendations */}
            {result.data.recommendations && result.data.recommendations.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Recommendations</p>
                <ul className="space-y-2">
                  {result.data.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start text-sm text-gray-600">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Times to Avoid */}
            {result.data.avoidTimes && result.data.avoidTimes.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-sm font-semibold text-red-700 mb-2">Times to Avoid</p>
                <div className="flex flex-wrap gap-2">
                  {result.data.avoidTimes.map((time: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence */}
            {result.data.confidence && (
              <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
                <span>AI Confidence</span>
                <div className="flex items-center">
                  <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                    <div
                      className="h-2 bg-green-500 rounded-full"
                      style={{ width: `${result.data.confidence}%` }}
                    />
                  </div>
                  <span className="font-medium">{result.data.confidence}%</span>
                </div>
              </div>
            )}
          </div>
        );
      case 'segments':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
            <div className="space-y-3">
              {(result.segments || []).map((seg: any, i: number) => (
                <div key={i} className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <UserGroupIcon className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{seg.name || seg}</h4>
                        {seg.description && (
                          <p className="text-sm text-gray-600 mt-1">{seg.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      {seg.contactCount !== undefined && (
                        <span className="px-3 py-1 bg-teal-100 text-teal-700 text-sm font-medium rounded-full">
                          {seg.contactCount} contacts
                        </span>
                      )}
                      {seg.priority && (
                        <span className={`mt-2 px-2 py-0.5 text-xs font-medium rounded ${
                          seg.priority === 'high' ? 'bg-red-100 text-red-700' :
                          seg.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {seg.priority} priority
                        </span>
                      )}
                    </div>
                  </div>
                  {seg.suggestedAction && (
                    <div className="bg-white/60 rounded-lg p-3 mt-3">
                      <p className="text-xs font-semibold text-teal-700 mb-1">Suggested Action</p>
                      <p className="text-sm text-gray-700">{seg.suggestedAction}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case 'campaign':
        const ideas = result.data.ideas || [result.data];
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
            <div className="space-y-4">
              {ideas.map((idea: any, i: number) => (
                <div key={i} className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-5 border border-yellow-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start">
                    <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center mr-4 flex-shrink-0">
                      <LightBulbIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-gray-900 text-lg">{idea.title || idea.name || 'Campaign Idea'}</h4>
                        {idea.estimatedImpact && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            idea.estimatedImpact === 'high' ? 'bg-green-100 text-green-700' :
                            idea.estimatedImpact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {idea.estimatedImpact} impact
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{idea.description}</p>

                      {/* Tags row */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {idea.type && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full capitalize">
                            {idea.type}
                          </span>
                        )}
                        {idea.targetAudience && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {idea.targetAudience}
                          </span>
                        )}
                        {idea.difficulty && (
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            idea.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            idea.difficulty === 'medium' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {idea.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Details section */}
                      {(idea.suggestedTiming || idea.keyMetrics) && (
                        <div className="mt-4 pt-4 border-t border-yellow-200 grid grid-cols-2 gap-4">
                          {idea.suggestedTiming && (
                            <div>
                              <p className="text-xs font-semibold text-yellow-700 mb-1">Best Timing</p>
                              <p className="text-sm text-gray-700">{idea.suggestedTiming}</p>
                            </div>
                          )}
                          {idea.keyMetrics && idea.keyMetrics.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-yellow-700 mb-1">Key Metrics</p>
                              <div className="flex flex-wrap gap-1">
                                {idea.keyMetrics.map((metric: string, j: number) => (
                                  <span key={j} className="px-2 py-0.5 bg-white/70 text-gray-600 text-xs rounded">
                                    {metric}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Tools</h1>
            <p className="mt-1 text-sm text-gray-500">
              Supercharge your marketing with AI-powered content generation
            </p>
          </div>
        </div>
      </div>

      {!activeTool ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
              <SparklesIcon className="h-8 w-8 mb-3 opacity-80" />
              <p className="text-3xl font-bold">{AI_TOOLS.length}</p>
              <p className="text-primary-100">AI Tools Available</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <DocumentTextIcon className="h-8 w-8 text-blue-500 mb-3" />
              <p className="text-3xl font-bold text-gray-900">Unlimited</p>
              <p className="text-gray-500">Generations</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <ClockIcon className="h-8 w-8 text-green-500 mb-3" />
              <p className="text-3xl font-bold text-gray-900">&lt; 5s</p>
              <p className="text-gray-500">Average Response</p>
            </div>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AI_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:shadow-xl hover:border-gray-300 transition-all duration-300 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <tool.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {tool.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{tool.description}</p>
                <div className="mt-4 flex items-center text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Use Tool <ChevronRightIcon className="h-4 w-4 ml-1" />
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Tool Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setActiveTool(null);
                    setResult(null);
                  }}
                  className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                {(() => {
                  const tool = getActiveTool();
                  return tool ? (
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mr-4`}>
                      <tool.icon className="h-6 w-6 text-white" />
                    </div>
                  ) : null;
                })()}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{getActiveTool()?.name}</h2>
                  <p className="text-sm text-gray-500">{getActiveTool()?.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tool Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Input</h3>
                {renderToolForm()}
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="mt-6 w-full inline-flex justify-center items-center px-6 py-4 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Generate with AI
                    </>
                  )}
                </button>
              </div>

              {/* Output Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Output</h3>
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-4 animate-pulse">
                      <SparklesIcon className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-gray-600 font-medium">AI is working its magic...</p>
                    <p className="text-gray-400 text-sm mt-1">This usually takes a few seconds</p>
                  </div>
                ) : result ? (
                  renderResult()
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                      <SparklesIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Your AI-generated content will appear here</p>
                    <p className="text-gray-400 text-sm mt-1">Fill in the form and click Generate</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
