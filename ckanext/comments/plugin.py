#!/usr/bin/python
# -*- coding: utf-8 -*-
#
# Comments Plug-in
#
import ckan.plugins as p
from ckan.common import _
from ckan.lib.base import config

from pylons import c, request
from ckanext.hrifi.authentication.wordpress_auth import WordPressClient


class CommentsPlugin(p.SingletonPlugin):
    p.implements(p.ITemplateHelpers)
    p.implements(p.IConfigurer, inherit=True)
    
    
    def update_config(self, config):
        # Add this plugin's templates dir to CKAN's extra_template_paths, so
        # that CKAN will use this plugin's custom templates.
        p.toolkit.add_template_directory(config, 'templates')
        # Similarily for the public directory.
        p.toolkit.add_public_directory(config, 'public')
        # Here we add "scripts" and "css" Fanstatic libraries. Warning! 'css' library is apparently taken already...
        # And the comment_ we need just for the right version of jQuery so it gets added first ><
        p.toolkit.add_resource('public/scripts/', 'comment_')
        p.toolkit.add_resource('public/scripts/', 'comment_scripts')
        #p.toolkit.add_resource('public/css/', 'comment_css')
    
    # Below are the helper methods for creating the HTML interface
    
    @staticmethod
    def produce_comments():
        """
        This helper function renders all comments for a given dataset.
        
        DEPRACATED as comments will be queried from WordPress using Ajax.
        """
        html = "<ol class='commentlist'><img src='/fi/wp-content/themes/hri2/img/ajax-loader2.gif' id='comment-loader' width='180'></ol>"
        
        return p.toolkit.literal(html)
    
    @staticmethod
    def produce_subsciption_form():
        """
        This helper function creates a HTML-form for subscribing to a given dataset's comments.
        """
        html  = '<a id="comment_subscribe_link" onClick="toggleSubscribeContent();">' + _('Email notification on new comments: subscribe or unsubscribe.') + '</a>'
        html += '<div id="subscribe_content" style="display:none">'
        html += '<form action="http://' + config.get('wordpress_url', 'www.hri.fi') + '/fi/tilaa-kommentit/" method="post">'
        html += '    <a id="subscribe_toggle_close" class="bold right" onClick="toggleSubscribeContent();">' + _('Close') + '</a>'
        html += '    <div class="row">'
        html += '        <label for="hri_subscribe_email" style="float: left; margin-top: 7px;">' + _('Email') + '</label>'
        html += '        <span class="required" style="float: left; margin: 0px 10px;">*</span>'
        html += '        <input class="text" id="hri_subscribe_email" type="email" required="required" size="30" value="" name="hri_subscribe_email" style="float: left;" />'
        html += '    </div>'
        html += '    <div class="row">'
        html += '        <input type="hidden" value="1189" name="hri_subscribe_post" />'
        html += '        <input type="hidden" value="1" name="hri_subscribe_blog" />'
        html += '        <div class="hri_radio hri_radio_checked" onclick="hriRadioCheckInputDiv(this);"><input checked="checked" class="hri_subscribe_option radio" type="radio" name="hri_subscribe_option" id="hri_subscribe_option1" value="1"></div><label class="hri_subscribe_label" for="hri_subscribe_option1" onclick="hriRadioCheckLabel(this);">' + _('Subscribe to notifications on new messages to this thread') + '</label>'
        html += '        <div class="hri_radio" onclick="hriRadioCheckInputDiv(this);"><input class="hri_subscribe_option radio" type="radio" name="hri_subscribe_option" id="hri_subscribe_option2" value="2"></div><label class="hri_subscribe_label" for="hri_subscribe_option2" onclick="hriRadioCheckLabel(this);">' + _('Unsubscribe from notifications on this thread') + '</label>'
        html += '        <div class="hri_radio" onclick="hriRadioCheckInputDiv(this);"><input class="hri_subscribe_option radio hri_subscribe_option_top_margin" type="radio" name="hri_subscribe_option" id="hri_subscribe_option3" value="3"></div><label class="hri_subscribe_label" class="hri_subscribe_option_top_margin" for="hri_subscribe_option3" onclick="hriRadioCheckLabel(this);">' + _('Unsubscribe from notifications on all discussions on HRI') + '</label>'
        html += '        <br class="clear">'
        html += '        <input class="plus-submit" type="button" name="hri_subscribe_submit" id="hri_subscribe_submit" value="' + _('Submit') + '" onClick="subscriptionButton();" />'
        html += '    </div>'
        html += '</form>'
        html += '</div>'
        
        return p.toolkit.literal(html)

    @staticmethod
    def produce_commenting_form():
        """
        This helper function creates a HTML-form for inputting comments.
        """

        # Ask wp for the wordpress_user_id for this session
        # @TODO Get this from c or a cookie etc? This is slow.
        try:
            if c.user:
                wordpress_client = WordPressClient(request.environ)
                wordpress_user_id = wordpress_client.get_user_id()
            else:
                wordpress_user_id = False;
        except Exception:
            wordpress_user_id = False;

        html  = '<div id="respond"> <h3 id="reply-title">' + _('Make a Comment') + ' <small><a rel="nofollow" id="cancel-comment-reply-link" onclick="cancelCommentResponse();" href="#comments" style="display:none;">' + _('Cancel reply') + '</a></small></h3> <form action="http://www.hri.fi/wp-comments-post.php" method="post" id="commentform-rate"> <input type="hidden" name="lang" value="fi" /> <input type="hidden" name="redirect_to" value="http://www.hri.fi/fi/data/paakaupunkiseudun-aluejakokartat/" /> <input type="hidden" id="hri-blog" value="1" />'
        if wordpress_user_id:
            html += '<input class="" id="email" name="email" hidden="hidden" style="display: none" value="" />'
            html += '<input class="" id="author" name="author" hidden="hidden" style="display: none" value="" />'
            html += '<input class="" id="user_id" name="user_id" hidden="hidden" style="display: none" value="' + wordpress_user_id + '" />'
        else:
            html += _("Your e-mail won't be made public. Mandatory fields are marked with a *.")
            html += ' <p class="comment-form-author"><label for="author">' + _('Name') + '<span class="required">*</span></label> <input class="text" id="author" name="author" type="text" value="" size="30" /></p>'
            html += ' <p class="comment-form-email"><label for="email">' + _('Email') + '<span class="required">*</span></label> <input class="text" id="email" name="email" type="email" value="" size="30" /></p>'
            html += '<input class="" id="user_id" name="user_id" hidden="hidden" style="display: none" value="" />'
        html += '<p class="comment-form-comment"><label for="comment">' + _('Comment') + '</label><textarea id="comment" name="comment" cols="45" rows="8" aria-required="true"></textarea></p> <p><label for=\'subscribe-reloaded\'><input style=\'width:30px\' type=\'checkbox\' name=\'subscribe-reloaded\' id=\'subscribe-reloaded\' value=\'yes\' /> ' + _('Order new comments to your e-mail.') + '</label></p> <p class="form-submit"> <input name="submit" type="button" id="comment_button" value="' + _('Submit Comment') + '" onClick="newComment()" /> <input type=\'hidden\' name=\'comment_post_ID\' value=\'\' id=\'comment_post_ID\' /><input type=\'hidden\' name=\'comment_parent\' id=\'comment_parent\' value=\'0\' /> </p> </form> </div><!-- #respond -->'
        html += '<noscript><a id="#commentform"></a>' + _('Commenting requires JavaScript.') + '</noscript><div id="hri_subscribe_toggle">'
        
        return p.toolkit.literal(html)
    
    @staticmethod
    def comments():
        """
        This helper handles rendering all the comments-related HTML.
        
        usage: {{ h.comments() }}
        """
        html = CommentsPlugin.produce_comments() + CommentsPlugin.produce_subsciption_form() + CommentsPlugin.produce_commenting_form()
        
        return p.toolkit.literal('<div id="comments">') + p.toolkit.literal(html) + p.toolkit.literal('</div>')

    def get_helpers(self):
        # This method is defined in the ITemplateHelpers interface and
        # is used to return a dict of named helper functions.
        
        return {'comments': CommentsPlugin.comments}
