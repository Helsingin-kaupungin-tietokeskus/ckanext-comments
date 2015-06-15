/**
 * CKAN Comments jQuery plugin
 * 
 * This plugin offers Ajax proxy commenting to and from WordPress from an
 * external CKAN site
 * 
 * Note that due to one origin policy, sites need to be under the same domain.
 * 
 * @author FM Janne Mikkonen <janne.mikkonen@hiq.fi>
 */
(function($) {
	
	// Default settings to be used by XML-RPC (Ajax) calls.
	var default_settings = {
		// @todo Remove these two? The functions used here no longer require login. 
		//       Left these so the style conforms to other XML-RPC functions. 
		wordpress_username:  "guest",
		wordpress_password:  "guest",
		xmlrpcurl:           "",
		commentlist:         ".commentlist",
		blog_id:             "1",
		packagename:         undefined,
		post_id:             undefined,
		appendcomment:       appendComment,
		appendcomments:      appendComments,
		// Callbacks - notification
		usernotification:    defaultNotification,
		errornotification:   defaultNotification,
		generalnotification: generalNotification,
		commentnotification: commentNotification,
		// Callbacks - notification
		oncommentsuccess:    function() {},
		parselocalizeddate:  dateFromFinnishDate,
		avatar_src:          "http://1.gravatar.com/avatar/ff6e45f35764ad62117d3b14490799c9?s=30&d=http%3A%2F%2Fwww.gravatar.com%2Favatar%2Fad516503a11cd5ca435acc9bb6523536%3Fs%3D30&r=G",
		phrases:             {
			no_wp_id_found:    "Commenting is unavailable for this dataset.",
			reply:             "Reply",
			report:            "Report inappropriate content",
			already_said:      "Duplicate comment detected; it looks as though you've already said that!",
			subscribe_success: "Successfully subscribed to comments on this page.",
			subscribe_rem:     "Your subscription to comments on this page was succesfully removed.",
			subscribe_remall:  "Succesfully removed all your subscriptions to comments on this site.",
			subscribe_fail:    "Already subscribed to post's comments.",
            subscribe_remfail: "Cannot remove a non-existing subscription."
		}
	};
	

	$.comments = function(options) {
		
		// Set dataset name (alias packagename) as default if it is given.
		if(options.packagename !== undefined) { default_settings.packagename = options.packagename; }
		if(options.datasetname !== undefined) { default_settings.packagename = options.datasetname; }
		// If we got a post_id, save it now for replying later.
		if(options.post_id !== undefined && options.post_id) { default_settings.post_id = options.post_id; }
		
		// Create settings by adding given options on top of default settings.
		settings = $.extend(default_settings, options);
		
		// Check our parameters to deduce what the user wants us to do.
		if(options.newcomment !== undefined || options === "newcomment") {
			
			newComment(settings);
		}
		else if(options.refresh !== undefined || options === "refresh") {
			
			// Clear out old comments in case we're refreshing the list.
			$(settings.commentlist).children().remove();
			
			getDatasetsComments(settings);
		}
		else if(options.subscribe !== undefined) {
			
			subscribeToComments(settings);
		}
		else if(options.unsubscribe !== undefined) {
			
			removeSubscriptionToComments(settings);
		}
		else if(options.unsubscribeall !== undefined) {
			
			removeAllSubscriptionsToComments(settings);
		}
		else {
			// No matches so we'll do init.

			// We can't do anything unless user provides us with the name of the dataset.
			var no_dataset_name = !default_settings.packagename || default_settings.packagename === undefined;
			var no_comment_data = !options.comments || options.comments === undefined;
			if(no_dataset_name && no_comment_data) {
				
				(settings.errornotification)("No dataset name or data given - comments are unavailable.");
			}
			else {
				
				getComments(settings);
			}
		}
		
		return this;
	}
	
	function generalNotification(notification, color) {
		if(notification !== undefined && notification && notification != "") { 
			if(color === undefined || !color) { color = "#920"; }
			$(".primary").prepend("<div style='margin-left: 25px; margin-top: 10px; color: " + color + ";'><li>" + notification + "</li></div>");
		}
	}

	function commentNotification(notification, color) {
		if(notification !== undefined && notification && notification != "") {
			if(color === undefined || !color) { color = "#920"; }
			$(".primary").append("<div style='margin-left: 25px; margin-top: -50px; margin-bottom: 50px; color: " + color + ";'><li>" + notification + "</li></div>"); 
		}
	}

	function defaultNotification(notification, color) {
		
		if(notification !== undefined && notification && notification != "") { 

			generalNotification(notification, color);
			commentNotification(notification, color);
		}
	}
		
	/**
	 * Ajax function for getting comments from WordPress through XML-RPC API.
	 *
	 * http://codex.wordpress.org/XML-RPC_WordPress_API/Comments#wp.getComments
	 */
	function getComments(settings) {
		
		// First we need this dataset's id on the WordPress side of things.
		// We need the id to get the right set of comments.
		if(!settings.post_id) {
			
			$.xmlrpc({
				url: settings.xmlrpcurl + '/xmlrpc.php',
				methodName: 'wp.getPostId',
				params: [settings.wordpress_username, settings.wordpress_password, settings.packagename],
				success: function(response, status, jqXHR) { 
					
					if(response[0][0] == undefined) {

						(settings.errornotification)(settings.phrases.no_wp_id_found);
						$("#comments").remove();
					}
					else {

						// As we've now acquired the id, let's use it to acquire comments for this dataset.
						settings.post_id = default_settings.post_id = response[0][0].ID;
						$("#comment_post_ID").val(settings.post_id);
						
						getDatasetsComments(settings);
					}
				},
				error: function(jqXHR, status, error) {
					
					(settings.errornotification)(error);
				}
			});
		}
		// Of course if we already have the id there's no point it getting it the second time. 
		// Just get the comments.
		else {
			
			getDatasetsComments(settings);
		}
	}
	
	function produceCommentReplyLink(settings, comment_id) {
		return '<a onclick="return respondToComment(\'' + comment_id + '\');" href="#respond" class="comment-reply-link">' + settings.phrases.reply + '</a>';
	}

	/** http://stackoverflow.com/questions/1500260/detect-urls-in-text-with-javascript + http://www.w3schools.com/jsref/jsref_link.asp */
	function linkify(text) {  
        
        var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;  
        
        return text.replace(urlRegex, function(url) { return url.link(url); });
    }

    /** Replaces carriage returns with new paragraphing. Note that this only works right because we assume <p> + text </p> wrapping is done. */
    function handleCarriageReturns(text) {
        
        return text.replace(/(\r\n|\n|\r)/gm, "</p><p>");
    }

	function appendComment(settings, item) {

		var date_gmt = settings.parselocalizeddate(item.date_created_gmt);
		var date = new Date();
		date.setTime(date_gmt.getTime() - date_gmt.getTimezoneOffset() * 60 * 1000);
		var minutes = date.getMinutes();
		if(minutes < 10) { minutes = "0" + minutes; }
		var date_string = date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " " + date.getHours() + ":" + minutes;
		
		return '<li class="comment byuser comment-author-USERS-NAME even thread-even depth-' + item.indent + ' comment_type_comment lang-fi" id="li-comment-' +  item.comment_id + '">' +
			'<div id="comment-' + item.comment_id + '">' +
			'<div class="comment-body">' +
			'<div class="comment-body-content"><p>' + handleCarriageReturns(linkify(item.content)) + '</p></div>' +
			'<div class="clear"></div><div class="comment-nuoli"></div>' +
			'</div>' +
			'<div class="clear"></div>' +
			'<div class="comment-meta commentmetadata">' +
			'<img  src="' + item.avatar_src + '" class="avatar avatar-30 avatar-default" height="30" width="30" style="width: 30px; height: 30px;" />' +
			'<span class="name">' + item.author + '</span>' +
			'<br />' +
			'<span class="timestamp">' +
			'<span title="' + date_string + '">' + date_string + '</span>' +
			'</span>' +
			'<a class="report-comment" id="report-comment-' + item.comment_id + '" onclick="reporting(this);">' + settings.phrases.report + '</a>' +
			produceCommentReplyLink(settings, item.comment_id) +
			'</div>' +
			'</div>' +
			'</li>';
	}

	function appendComments(settings, comments, parent_id) {
		
		var data = "";
		$.each(comments, function(i, comment) {
			
			if(comment.parent === parent_id) {
				
				data = data + (settings.appendcomment)(settings, comment.item);

				if(comment.item.has_children) {
					
					data = data + '<ul class="children">' + appendComments(settings, comments, comment.comment_id) + '</ul>';
				}
			}
		});

		return data;
	}
	
	function countIndentations(comment, comments, count) {

		// Find the parent to see if it has a parent.
		$.each(comments, function(i, comment2) {

			if(comment2.comment_id === comment.parent) {

				// This is the parent comment.
				comment2.item.has_children = true;

				// Does the parent have a parent?
				if(comment2.parent !== 0 || comment2.parent !== '0') {

					count = countIndentations(comment2, comments, count);
				}
			}
		});

		return count + 1;
	}

	function dateFromFinnishDate(date) { 

		var reformat = date.replace(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/, '$1|$2|$3|$4|$5|00').split('|');
		return new Date(reformat[2], reformat[1] - 1, reformat[0], reformat[3], reformat[4], reformat[5]);
	}

	function orderComments(comments, ordered_comments, parent_id) {

		// Gather each comment for this particular parent.
		var comments_for_this_parent = [];
		$.each(comments, function(i, comment) {

			if(comment.parent === parent_id) {

				comments_for_this_parent.push(comment);
			}
		});

		// Order these comments by creation date.
		comments_for_this_parent.sort(function(a, b) { 

			var b_created = settings.parselocalizeddate(b.created);
			var a_created = settings.parselocalizeddate(a.created);

			return -(b_created - a_created);
		});

		// Put the children right under their parent.
		if(ordered_comments.length == 0) {

 			// Shallow copy, as orderComments recursion below can alter ordered_comments (= comments_for_this_parent if not copied.)
			ordered_comments = comments_for_this_parent.slice(0);
		}
		else {

			var parent_index = 0;
			$.each(comments, function(i, comment) {	if(comment.comment_id === parent_id) { parent_index = i; } });

			$.each(comments_for_this_parent, function(i, comment) {

				ordered_comments.splice(parent_index + i, 0, comment);
			});
		}

		// For each of the children that has children, repeat the process.
		$.each(comments_for_this_parent, function(i, comment) {

			if(comment.item.has_children) {
				
				orderComments(comments, ordered_comments, comment.comment_id);
			}
		});

		return ordered_comments;
	}

	function produceComments(settings, comments) {

		// Count the indentations for all items and set has_children flags.
		$.each(comments, function(i, comment) {

			// Item has a parent.
			if(comment.parent !== 0 && comment.parent !== '0') {

				comment.item.indent = countIndentations(comment, comments, 0);
			}
			else {

				comment.item.indent = 1;
			}
		});

		// Now using this grouping, reorder the comments to reflect parent-child relationships.
		var ordered_comments = [];
		ordered_comments = orderComments(comments, ordered_comments, "0");

		// Finally clear out the old ones and add the comments in this order to the UI.
		$(".commentlist").children().remove();
		$(settings.commentlist).append((settings.appendcomments)(settings, ordered_comments, "0"));
	}

	/** Put comments into our own wrapper, so we can keep track of indents etc. */
	function organizeComments(settings, data) {

		var comments = [];
		$.each(data, function(i, item) {

			// Set defaults.
			if(item.avatar_src === undefined) { item.avatar_src = settings.avatar_src; }
			item.has_children = false;

			comments[i] = {comment_id: item.comment_id, parent: item.parent, created: item.date_created_gmt, item: item};
		});

		return comments;
	}

	/**
	 * Ajax helper for retrieving comments for a given WordPress post_id.
	 *
	 * @param int post_id
	 */
	function getDatasetsComments(settings) {
		
		if(!settings.post_id) { return false; }
		
		if(settings.comments !== undefined) {
			// Comments were given, just render them.
			var comments = organizeComments(settings, settings.comments);
			produceComments(settings, comments);
		}
		else {
			// If no comments were given, go get all the comments for the given post_id.
			$.xmlrpc({
				url: settings.xmlrpcurl + '/xmlrpc.php',
				methodName: 'hri.getComments',
				params: [settings.blog_id, settings.wordpress_username, settings.wordpress_password, {'post_id': settings.post_id}],
				success: function(response, status, jqXHR) { 
					
					// Group the comments to a new object like so.
					var comments = organizeComments(settings, response[0]);
					produceComments(settings, comments);
				},
				error: function(jqXHR, status, error) {
					
					(settings.errornotification)(error);
				}
			});
		}
	}
	
	/**
	 * Ajax function for creating a new comment through XML-RPC API.
	 *
	 * http://codex.wordpress.org/XML-RPC_WordPress_API/Comments#wp.newComment
	 */
	function newComment(settings) {
		
		if(!settings.post_id) { return false; }
		
		var comment_parent = settings.comment_parent;
		var content        = settings.content;
		var author         = settings.author;
		var author_url     = settings.author_url;
		var author_email   = settings.author_email;
		var user_id        = settings.user_id;
		// Delete comments property so getComments refreshes the collection.
		delete settings['comments'];
		 
		$.xmlrpc({
			url: settings.xmlrpcurl + '/xmlrpc.php',
			methodName: 'hri.newComment',
			params: [settings.blog_id, settings.wordpress_username, settings.wordpress_password, settings.post_id, {'comment_parent': comment_parent, 'content': content, 'author': author, 'author_url': author_url, 'author_email': author_email, 'user_id': user_id}],
			success: function(response, status, jqXHR) { 
			
				getComments(settings);
				// Call the on-success callback.
				(settings.oncommentsuccess)();
			},
			error: function(jqXHR, status, error) {
				
				// Successful new comment will always prompt "Error: Invalid XML: Error: Comment language meta fail" so ignore that.
				if(error != "Error: Invalid XML: Error: Comment language meta fail") {

					if(error.msg.indexOf("Duplicate comment detected") > -1) {

						(settings.commentnotification)(settings.phrases.already_said);
					}
					else {
						
						(settings.errornotification)(error);
					}
				}
				else {
					
					getComments(settings);
					// Call the on-success callback.
					(settings.oncommentsuccess)();
				}
			}
		});
	}
	
	/**
	 * Ajax function for removing a previously set subscription to a post's comments through XML-RPC API.
	 * 
	 * @param int settings.post_id
	 * @param string (email) settings.email
	 */
	function subscribeToComments(settings) {
		
		if(!settings.post_id) { return false; }
		 
		$.xmlrpc({
			url: settings.xmlrpcurl + '/xmlrpc.php',
			methodName: 'hri.subscribeToComments',
			params: [settings.wordpress_username, settings.wordpress_password, settings.post_id, settings.email],
			success: function(response, status, jqXHR) { 
				
				(settings.commentnotification)(settings.phrases.subscribe_success, "#090");
			},
			error: function(jqXHR, status, error) {
				
				if(error.msg.indexOf("Already subscribed to post's comments.") > -1) {

					(settings.commentnotification)(settings.phrases.subscribe_fail);
				}
				else {
					
					(settings.errornotification)(error);
				}
			}
		});
	}

	/**
	 * Ajax function for removing a previously set subscription to a post's comments through XML-RPC API.
	 * 
	 * @param int settings.post_id
	 * @param string (email) settings.email
	 */
	function removeSubscriptionToComments(settings) {
		
		if(!settings.post_id) { return false; }
		 
		$.xmlrpc({
			url: settings.xmlrpcurl + '/xmlrpc.php',
			methodName: 'hri.removeSubscriptionToComments',
			params: [settings.wordpress_username, settings.wordpress_password, settings.post_id, settings.email],
			success: function(response, status, jqXHR) { 
				
				(settings.commentnotification)(settings.phrases.subscribe_rem, "#090");
			},
			error: function(jqXHR, status, error) {
				
				if(error.msg.indexOf("Cannot remove a non-existing subscription.") > -1) {

					(settings.commentnotification)(settings.phrases.subscribe_remfail);
				}
				else {
					
					(settings.errornotification)(error);
				}
			}
		});
	}

	/**
	 * Ajax function for removing all previously set subscriptions to comments through XML-RPC API.
	 * 
	 * @param string (email) settings.email
	 */
	function removeAllSubscriptionsToComments(settings) {
		
		if(!settings.post_id) { return false; }
		 
		$.xmlrpc({
			url: settings.xmlrpcurl + '/xmlrpc.php',
			methodName: 'hri.removeAllSubscriptionsToComments',
			params: [settings.wordpress_username, settings.wordpress_password, settings.email],
			success: function(response, status, jqXHR) { 
				
				(settings.commentnotification)(settings.phrases.subscribe_remall, "#090");
			},
			error: function(jqXHR, status, error) {
				
				(settings.errornotification)(error);
			}
		});
	}

})(jQuery);
