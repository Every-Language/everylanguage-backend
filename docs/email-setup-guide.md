# Email Setup Guide for Every Language

This guide walks you through setting up professional email templates and SMTP for your Every Language project.

## 🎯 What's Already Done

✅ **Email Templates Created**: Professional HTML templates for all auth flows  
✅ **Config.toml Updated**: Email configuration added for local and production  
✅ **CI/CD Enhanced**: Automatic deployment of email config changes  
✅ **Environment-Specific Settings**: Different configs for dev/prod

## 📧 SMTP Provider Setup (Resend - Recommended)

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (3,000 emails/month free)
3. Verify your account

### 2. Add Your Domain

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter `everylanguage.com`
4. Follow DNS setup instructions (see below)

### 3. DNS Configuration

Add these DNS records to your domain registrar:

```dns
# TXT Record for domain verification
Name: _resend
Value: (provided by Resend)

# MX Record for bounce handling
Name: @
Value: feedback-smtp.resend.com
Priority: 10

# TXT Record for SPF
Name: @
Value: v=spf1 include:_spf.resend.com ~all

# TXT Record for DKIM
Name: resend._domainkey
Value: (provided by Resend)

# TXT Record for DMARC
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@everylanguage.com
```

### 4. Get API Key

1. Go to **API Keys** in Resend dashboard
2. Click **Create API Key**
3. Name it "Every Language Production"
4. Copy the API key (starts with `re_`)

## 🔐 Environment Variables Setup

### Local Development (.env)

Create `.env` in project root:

```bash
RESEND_API_KEY=re_your_api_key_here
```

### GitHub Secrets

Add to your GitHub repository secrets:

```bash
RESEND_API_KEY=re_your_api_key_here
```

Go to: Repository → Settings → Secrets and variables → Actions

## 🚀 Production Deployment Steps

### 1. Push Configuration Changes

```bash
git add .
git commit -m "feat: add professional email templates and SMTP configuration"
git push origin develop
```

This will:

- Deploy your email templates
- Configure SMTP settings (but disabled by default)
- Apply environment-specific configs

### 2. Enable SMTP in Production

After your domain is verified in Resend:

1. **For Development**: Update `config.toml` and set:

   ```toml
   [remotes.development.auth.email.smtp]
   enabled = true
   ```

2. **For Production**: Update `config.toml` and set:

   ```toml
   [remotes.production.auth.email.smtp]
   enabled = true
   ```

3. Push changes:
   ```bash
   git commit -am "feat: enable SMTP for production"
   git push origin develop  # Then merge to main
   ```

## 📧 Email Templates Overview

### Templates Created:

1. **confirmation.html** - New user email verification
2. **invite.html** - User invitation emails
3. **recovery.html** - Password reset emails
4. **magic_link.html** - Passwordless sign-in
5. **email_change.html** - Email address change confirmation

### Template Features:

- ✅ **Professional Design** with Every Language branding
- ✅ **Mobile Responsive** layouts
- ✅ **Security Features** (OTP codes, expiration warnings)
- ✅ **Anti-Phishing Protection** (TokenHash strategy)
- ✅ **Accessibility** compliant

## 🧪 Testing Your Setup

### Local Testing

1. Start Supabase locally: `supabase start`
2. Visit: `http://127.0.0.1:54324` (Inbucket email testing)
3. Test user registration/password reset
4. Check received emails in Inbucket

### Production Testing

1. Deploy to development environment
2. Test with real email addresses
3. Verify deliverability and design
4. Check spam folder placement

## 🔄 Configuration Sync with Dashboard

### Important Notes:

- **Config.toml takes precedence** over dashboard settings
- Your **CI/CD pipeline automatically syncs** config changes
- **Manual dashboard changes will be overwritten** on next deployment
- **Environment variables** are managed separately

### If You Made Manual Dashboard Changes:

1. Document the changes you made
2. Update your `config.toml` with those changes
3. Push to git - this will overwrite dashboard settings with your code
4. All future changes should be made in `config.toml`

### Future Configuration Changes:

1. ✅ **Edit `supabase/config.toml`**
2. ✅ **Commit and push changes**
3. ✅ **CI/CD automatically deploys**
4. ❌ Don't edit in Supabase dashboard

## 📊 Monitoring and Analytics

### Email Deliverability

- **Resend Dashboard**: View delivery rates, bounces, complaints
- **Domain Reputation**: Monitor with [MXToolbox](https://mxtoolbox.com)
- **Spam Testing**: Use [Mail Tester](https://mail-tester.com)

### Supabase Analytics

- Monitor email sending rates in Supabase dashboard
- Check rate limiting settings if emails are blocked
- Review auth logs for failed email attempts

## 🆘 Troubleshooting

### Common Issues:

**1. Emails not sending**

- Check SMTP credentials in GitHub secrets
- Verify domain DNS settings
- Check rate limits in config.toml

**2. Emails in spam folder**

- Verify SPF/DKIM/DMARC records
- Warm up your domain gradually
- Use consistent sender name/email

**3. Template not updating**

- Clear browser cache
- Check if config deployed successfully in GitHub Actions
- Verify template file paths in config.toml

**4. Local testing issues**

- Use Inbucket (port 54324) for local email testing
- Don't expect real emails in local development
- Check Supabase local logs for errors

## 🔮 Next Steps

### Optional Enhancements:

1. **Custom Sender Domains**: Set up `mail.everylanguage.com`
2. **Email Analytics**: Implement open/click tracking
3. **Transactional Emails**: Add notification emails beyond auth
4. **Template Localization**: Multi-language email support
5. **A/B Testing**: Test different email designs

### Production Checklist:

- [ ] Domain verified in Resend
- [ ] DNS records configured
- [ ] API key added to GitHub secrets
- [ ] SMTP enabled in production config
- [ ] Email templates tested
- [ ] Deliverability verified
- [ ] Team trained on config management

## 📞 Support

For issues with this setup:

- **Technical Issues**: Check GitHub Actions logs
- **Email Deliverability**: Contact Resend support
- **DNS Configuration**: Contact your domain registrar
- **Supabase Issues**: Check Supabase documentation

---

**Remember**: All configuration is now managed through code (config.toml) and deployed automatically via your CI/CD pipeline. This ensures consistency across environments and proper version control of your email settings.
