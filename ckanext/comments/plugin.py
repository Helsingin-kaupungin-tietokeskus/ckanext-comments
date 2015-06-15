#!/usr/bin/python
# -*- coding: utf-8 -*-
#
# Comments Plug-in
#
import ckan.plugins as p


class CommentsPlugin(p.SingletonPlugin):
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