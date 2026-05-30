from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import FileResponse
from django.http import Http404
from django.shortcuts import render
from django.views.generic import TemplateView
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.http import JsonResponse

SUPPORT_ARTICLES = [
    {
        'slug': 'track-study-hours-approved-locations-fraternity-members',
        'title': 'How to Track Study Hours in Approved Locations for Fraternity Members | GreekGeek',
        'meta_description': 'Learn how fraternity chapters can track member study hours at approved campus locations with GreekGeek GPS clock-ins, requirements, and reports.',
        'eyebrow': 'Approved location tracking',
        'h1': 'How do I track study hours in approved locations for fraternity members?',
        'intro': 'GreekGeek helps fraternity academic chairs replace library logs, screenshots, and spreadsheet updates with GPS-verified study sessions at approved campus locations.',
        'steps': [
            {
                'title': 'Create your approved study locations',
                'body': 'In the admin app, add each library, study hall, academic building, or chapter-approved study area where members are allowed to log study sessions.',
            },
            {
                'title': 'Set the study period and required hours',
                'body': 'Create a weekly, monthly, or custom study period so members know exactly how many hours they need before the deadline.',
            },
            {
                'title': 'Share the chapter registration code',
                'body': 'Members join your organization with the code from the chapter admin, then use the GreekGeek mobile app to see their requirement and clock in.',
            },
            {
                'title': 'Review member progress before the deadline',
                'body': 'Admins can use leaderboards and reports to see who is on track, who is behind, and where verified study sessions are happening.',
            },
        ],
        'tips': [
            'Start with the most common study locations first, such as the library or tutoring center.',
            'Use a clear radius for each approved location so members understand where a session can start.',
            'Check progress mid-period instead of waiting until the requirement is due.',
        ],
    },
    {
        'slug': 'gps-study-hour-tracking-for-sororities',
        'title': 'GPS Study Hour Tracking for Sororities | GreekGeek',
        'meta_description': 'GreekGeek helps sorority academic chairs track required study hours with GPS-approved locations, member codes, progress views, and reports.',
        'eyebrow': 'Sorority academic support',
        'h1': 'How can a sorority track study hours with GPS verification?',
        'intro': 'Sorority academic chairs can use GreekGeek to set study requirements, approve study locations, and give members a simple way to clock verified study sessions from their phones.',
        'steps': [
            {
                'title': 'Set your chapter requirement',
                'body': 'Create the study period and required hours for the members or groups your chapter needs to monitor.',
            },
            {
                'title': 'Approve campus study areas',
                'body': 'Add the physical locations where study time should count, such as the library, study rooms, or academic support centers.',
            },
            {
                'title': 'Have members clock in from the app',
                'body': 'Members open GreekGeek, confirm they are at an approved study area, and start their study session.',
            },
            {
                'title': 'Use reports for follow-up',
                'body': 'GreekGeek gives admins a clearer view of member progress so academic chairs can follow up before a requirement is missed.',
            },
        ],
        'tips': [
            'Keep the first setup simple: one period, one requirement, and a few trusted locations.',
            'Tell members that the organization code connects their account to the correct chapter.',
            'Use reports as an early warning system, not only as an end-of-period audit.',
        ],
    },
    {
        'slug': 'replace-fraternity-study-hour-spreadsheets',
        'title': 'Replace Fraternity Study Hour Spreadsheets | GreekGeek',
        'meta_description': 'See how GreekGeek replaces fraternity study hour spreadsheets with member clock-ins, GPS-approved locations, leaderboards, and chapter reports.',
        'eyebrow': 'Spreadsheet replacement',
        'h1': 'What is the best way to replace fraternity study hour spreadsheets?',
        'intro': 'Spreadsheets can work when a chapter is small, but they quickly become hard to trust when members send proof through forms, group chats, or screenshots. GreekGeek gives the chapter one live study record.',
        'steps': [
            {
                'title': 'Move requirements out of the spreadsheet',
                'body': 'Set the required hours and active study period in GreekGeek so members and admins work from the same rules.',
            },
            {
                'title': 'Replace self-reported rows with clock-ins',
                'body': 'Members log study sessions through the mobile app instead of asking an officer to update a sheet manually.',
            },
            {
                'title': 'Use approved locations for cleaner proof',
                'body': 'Location-based clock-ins make it easier to separate real study sessions from vague or late self-reports.',
            },
            {
                'title': 'Review reports instead of rebuilding totals',
                'body': 'Admins can review progress by member, group, location, and period without reformatting a spreadsheet every week.',
            },
        ],
        'tips': [
            'Keep the spreadsheet only as a temporary backup during the first rollout.',
            'Use the same study requirement language in GreekGeek that members already know.',
            'Tell members where approved study locations are before the period starts.',
        ],
    },
    {
        'slug': 'set-chapter-study-hour-requirements',
        'title': 'How to Set Chapter Study Hour Requirements | GreekGeek',
        'meta_description': 'Learn how chapter leaders can set required study hours, study periods, approved locations, and member progress tracking in GreekGeek.',
        'eyebrow': 'Chapter requirements',
        'h1': 'How do chapter leaders set study hour requirements?',
        'intro': 'GreekGeek lets chapter admins create study periods and required hours so members know what is due and officers can track progress throughout the period.',
        'steps': [
            {
                'title': 'Choose the study period cadence',
                'body': 'Create a weekly, monthly, or custom period based on how your chapter measures study hour progress.',
            },
            {
                'title': 'Enter the required hours',
                'body': 'Set the number of study hours members need for the active period.',
            },
            {
                'title': 'Connect the requirement to real locations',
                'body': 'Add approved study locations so members have clear places where their sessions can count.',
            },
            {
                'title': 'Monitor the active period',
                'body': 'Use the dashboard, leaderboard, and reports to see whether members are completing their requirement before the deadline.',
            },
        ],
        'tips': [
            'Use a short first period if you are testing the workflow for the first time.',
            'Create groups if your chapter needs class-year, pledge-class, or team-level reporting.',
            'Review progress while there is still time for members to catch up.',
        ],
    },
    {
        'slug': 'members-join-study-hours-app-with-chapter-code',
        'title': 'How Members Join a Study Hours App with a Chapter Code | GreekGeek',
        'meta_description': 'GreekGeek members join with a chapter code, then track required study hours, clock in at approved locations, and view progress from the mobile app.',
        'eyebrow': 'Member onboarding',
        'h1': 'How do members join a study hours app with a chapter code?',
        'intro': 'GreekGeek uses organization registration codes so members connect to the right chapter before they start tracking study hours.',
        'steps': [
            {
                'title': 'The chapter admin creates the organization',
                'body': 'An admin starts the organization trial, sets up the chapter workspace, and prepares the member registration code.',
            },
            {
                'title': 'Members download GreekGeek',
                'body': 'Members use the mobile app to create an account and choose the option to join an organization.',
            },
            {
                'title': 'Members enter the chapter code',
                'body': 'The code connects each member account to the correct chapter, requirement, approved locations, and leaderboard.',
            },
            {
                'title': 'Members track study sessions',
                'body': 'After joining, members can view their current requirement, clock in at approved locations, review history, and track leaderboard progress.',
            },
        ],
        'tips': [
            'Share the code from an official chapter channel so members know it is current.',
            'Ask members to join before the study period starts.',
            'If a member does not have a code, they should ask the chapter admin before creating a disconnected account.',
        ],
    },
]

SUPPORT_ARTICLES_BY_SLUG = {article['slug']: article for article in SUPPORT_ARTICLES}

CONTACT_TOPICS = [
    ('Organization setup', 'Organization setup'),
    ('Member access', 'Member access'),
    ('Study locations', 'Study locations'),
    ('Billing or trial', 'Billing or trial'),
    ('Technical support', 'Technical support'),
    ('Other', 'Other'),
]

COMPARISON_PAGES = [
    {
        'slug': 'greekgeek-vs-campusstudy',
        'title': 'GreekGeek vs CampusStudy | Study Hour Tracking Comparison',
        'meta_description': 'Compare GreekGeek and CampusStudy for fraternity and sorority study hour tracking, GPS-approved locations, reports, onboarding, pricing, and support.',
        'eyebrow': 'GreekGeek vs CampusStudy',
        'h1': 'GreekGeek vs CampusStudy',
        'intro': 'GreekGeek gives chapters the study-hour tools they need without the higher annual price or extra complexity.',
        'competitor': 'CampusStudy',
        'verdict': 'GreekGeek is cheaper, cleaner, and easier to roll out for a chapter that just needs study hours to work.',
        'greekgeek_price': '$149.99/year',
        'competitor_price': '$179/year',
        'rows': [
            ('GPS-based study tracking', True, True),
            ('Approved study locations', True, True),
            ('Study hour reports', True, True),
            ('Custom study periods', True, False),
            ('One-month free trial', True, False),
            ('Easy onboarding', True, False),
            ('Leaderboards', True, False),
            ('Live view of who is studying', True, False),
        ],
    },
    {
        'slug': 'greekgeek-vs-mygreekstudy',
        'title': 'GreekGeek vs MyGreekStudy | Study Hour Tracking Comparison',
        'meta_description': 'Compare GreekGeek and MyGreekStudy for fraternity and sorority study hours, GPS study locations, weekly reports, member requirements, pricing, and setup.',
        'eyebrow': 'GreekGeek vs MyGreekStudy',
        'h1': 'GreekGeek vs MyGreekStudy',
        'intro': 'GreekGeek is the modern study-hours alternative for chapters that want GPS clock-ins, reports, and a lower annual price.',
        'competitor': 'MyGreekStudy',
        'verdict': 'GreekGeek is cleaner, cheaper, and more focused on helping members stay on track.',
        'greekgeek_price': '$149.99/year',
        'competitor_price': '$250/year',
        'rows': [
            ('GPS-based study tracking', True, True),
            ('Approved study locations', True, True),
            ('Study hour reports', True, True),
            ('Custom study periods', True, False),
            ('One-month free trial', True, False),
            ('Easy onboarding', True, False),
            ('Leaderboards', True, False),
            ('Live view of who is studying', True, False),
        ],
    },
    {
        'slug': 'campusstudy-vs-mygreekstudy',
        'title': 'CampusStudy vs MyGreekStudy | GreekGeek Alternative Comparison',
        'meta_description': 'Compare CampusStudy and MyGreekStudy for Greek organization study hours, then see where GreekGeek fits as a lower-priced alternative.',
        'eyebrow': 'CampusStudy vs MyGreekStudy',
        'h1': 'CampusStudy vs MyGreekStudy',
        'intro': 'Before paying for either competitor, compare both against GreekGeek. GreekGeek gives chapters the core study-hour workflow at a lower annual price.',
        'competitor': 'CampusStudy and MyGreekStudy',
        'verdict': 'GreekGeek is the better first trial: lower price, focused setup, and the study-hour tools chapters actually use.',
        'greekgeek_price': '$149.99/year',
        'competitor_price': '$179-$250/year',
        'rows': [
            ('GPS-based study tracking', True, True),
            ('Approved study locations', True, True),
            ('Study hour reports', True, True),
            ('Custom study periods', True, False),
            ('One-month free trial', True, False),
            ('Easy onboarding', True, False),
            ('Leaderboards', True, False),
            ('Live view of who is studying', True, False),
        ],
    },
]

COMPARISON_PAGES_BY_SLUG = {page['slug']: page for page in COMPARISON_PAGES}

class LandingPageView(TemplateView):
    """Landing page view"""
    template_name = 'landing.html'

class LoginPageView(TemplateView):
    """Login page view"""
    template_name = 'login.html'

class RegisterPageView(TemplateView):
    """Register page view"""
    template_name = 'register.html'

def landing_page(request):
    """Landing page function-based view"""
    return render(request, 'landing.html')

def favicon(request):
    """Serve the site favicon at the browser-default path."""
    return FileResponse(open(settings.BASE_DIR / 'static' / 'img' / 'favicon.ico', 'rb'), content_type='image/x-icon')

def login_page(request):
    """Login page function-based view"""
    return render(request, 'login.html')

def register_page(request):
    """Register page function-based view"""
    return render(request, 'register.html')

def success_page(request):
    """Success page function-based view"""
    return render(request, 'success.html')

def forgot_password_page(request):
    """Forgot password page function-based view"""
    return render(request, 'forgot-password.html')

def reset_password_page(request, token):
    """Reset password page function-based view"""
    # The token validation will be handled by JavaScript on the frontend
    return render(request, 'reset-password.html', {'token': token})

def privacy_page(request):
    """Privacy policy page."""
    return render(request, 'privacy.html')

def terms_page(request):
    """Terms of service page."""
    return render(request, 'terms.html')

def contact_page(request):
    """Public contact form."""
    context = {
        'topics': CONTACT_TOPICS,
        'form': {
            'topic': request.GET.get('topic', ''),
        },
        'errors': {},
        'submitted': False,
    }

    if request.method == 'POST':
        form = {
            'name': request.POST.get('name', '').strip(),
            'email': request.POST.get('email', '').strip(),
            'organization': request.POST.get('organization', '').strip(),
            'topic': request.POST.get('topic', '').strip(),
            'message': request.POST.get('message', '').strip(),
            'company': request.POST.get('company', '').strip(),
        }
        errors = {}
        topic_values = {value for value, _ in CONTACT_TOPICS}

        if form['company']:
            errors['form'] = 'We could not send your message. Please try again.'
        if not form['name']:
            errors['name'] = 'Enter your name.'
        if not form['email']:
            errors['email'] = 'Enter your email.'
        else:
            try:
                validate_email(form['email'])
            except ValidationError:
                errors['email'] = 'Enter a valid email address.'
        if form['topic'] not in topic_values:
            errors['topic'] = 'Choose a topic.'
        if not form['message']:
            errors['message'] = 'Enter a message.'
        elif len(form['message']) < 12:
            errors['message'] = 'Add a little more detail so we can help.'

        context['form'] = form
        context['errors'] = errors

        if not errors:
            from .email_service import EmailService

            sent = EmailService().send_contact_email(
                name=form['name'],
                reply_to_email=form['email'],
                organization=form['organization'],
                topic=form['topic'],
                message=form['message'],
            )
            if sent:
                context['submitted'] = True
                context['form'] = {'topic': ''}
            else:
                context['errors'] = {
                    'form': 'We could not send your message right now. Please email support@greekgeek.app.'
                }

    return render(request, 'contact.html', context)

def compare_index(request):
    """SEO comparison hub for study-hour tracking alternatives."""
    return render(request, 'compare/index.html', {'pages': COMPARISON_PAGES})

def compare_page(request, slug):
    """Product comparison detail page."""
    page = COMPARISON_PAGES_BY_SLUG.get(slug)
    if not page:
        raise Http404('Comparison page not found')
    related_pages = [item for item in COMPARISON_PAGES if item['slug'] != slug]
    return render(request, 'compare/detail.html', {
        'page': page,
        'related_pages': related_pages,
    })

def support_index(request):
    """Support hub with SEO-focused app help articles."""
    return render(request, 'support/index.html', {'articles': SUPPORT_ARTICLES})

def support_article(request, slug):
    """Support article detail page."""
    article = SUPPORT_ARTICLES_BY_SLUG.get(slug)
    if not article:
        raise Http404('Support article not found')
    related_articles = [item for item in SUPPORT_ARTICLES if item['slug'] != slug][:3]
    return render(request, 'support/article.html', {
        'article': article,
        'related_articles': related_articles,
    })
