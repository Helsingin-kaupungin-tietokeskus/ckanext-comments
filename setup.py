from setuptools import setup, find_packages
import sys, os

version = '0.1'

setup(
	name='ckanext-comments',
	version=version,
	description="A plugin for enabling commenting on CKAN by proxying them to and from WordPress through XML-RPC API.",
	long_description="""\
	""",
	classifiers=[], # Get strings from http://pypi.python.org/pypi?%3Aaction=list_classifiers
	keywords='',
	author='FM Janne Mikkonen, M. Phil',
	author_email='janne.mikkonen@hiq.fi',
	url='',
	license='',
	packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
	namespace_packages=['ckanext', 'ckanext.comments'],
	include_package_data=True,
	zip_safe=False,
	install_requires=[
		# -*- Extra requirements: -*-
	],
	entry_points=\
	"""
        [ckan.plugins]
	# Add plugins here, eg
	# myplugin=ckanext.comments:PluginClass
	comments=ckanext.comments.plugin:CommentsPlugin
	""",
)
